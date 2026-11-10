terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = local.project_id
}

locals {
  project_id           = "smartstovepoc-31305"
  project_number       = "888670187034"
  github_repository_id = "576753698"
  github_owner_id      = "3460078"
  runtime_account      = "smartstovepoc-31305@appspot.gserviceaccount.com"
}

resource "google_project_service" "required" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudfunctions.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "firebase.googleapis.com",
    "firebasedatabase.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "serviceusage.googleapis.com",
    "storage.googleapis.com",
    "sts.googleapis.com",
  ])

  project            = local.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_service_account" "deployer" {
  project      = local.project_id
  account_id   = "github-firebase-deploy"
  display_name = "GitHub Firebase deployer"

  depends_on = [google_project_service.required]
}

resource "google_iam_workload_identity_pool" "github" {
  project                   = local.project_id
  workload_identity_pool_id = "github-firebase-deploy"
  display_name              = "GitHub Firebase deployment"

  depends_on = [google_project_service.required]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = local.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub Actions"

  attribute_mapping = {
    "google.subject"                = "assertion.sub"
    "attribute.repository_id"       = "assertion.repository_id"
    "attribute.repository_owner_id" = "assertion.repository_owner_id"
    "attribute.ref"                 = "assertion.ref"
    "attribute.event_name"          = "assertion.event_name"
  }

  attribute_condition = <<-EOT
    assertion.repository_id == '${local.github_repository_id}' &&
    assertion.repository_owner_id == '${local.github_owner_id}' &&
    assertion.ref == 'refs/heads/main' &&
    assertion.event_name == 'push'
  EOT

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_deployer" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/projects/${local.project_number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github.workload_identity_pool_id}/attribute.repository_id/${local.github_repository_id}"

  depends_on = [google_iam_workload_identity_pool_provider.github]
}

resource "google_project_iam_member" "deployer" {
  for_each = toset([
    "roles/cloudfunctions.admin",
    "roles/firebasedatabase.admin",
  ])

  project = local.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_service_account_iam_member" "runtime_user" {
  service_account_id = "projects/${local.project_id}/serviceAccounts/${local.runtime_account}"
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer.email}"
}
