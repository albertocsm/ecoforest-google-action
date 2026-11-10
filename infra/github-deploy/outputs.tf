output "workload_identity_provider" {
  description = "Provider resource name for google-github-actions/auth."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "deployer_service_account_email" {
  description = "Deployment service account for google-github-actions/auth."
  value       = google_service_account.deployer.email
}
