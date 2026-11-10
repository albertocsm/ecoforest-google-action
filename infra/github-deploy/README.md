# GitHub deployment identity

This Terraform root provisions a dedicated deployer and GitHub OIDC provider in
`smartstovepoc-31305` (number `888670187034`). Only push events on
`refs/heads/main` from repository ID `576753698` and owner ID `3460078` can
federate. No workflow or deployment is created or run by Terraform.

The deployer has project-level Cloud Functions Admin and Firebase Realtime
Database Admin, plus Service Account User on the existing App Engine default
runtime account. Realtime Database Admin includes the Firebase project-read
permissions needed by the CLI. IAM member resources are additive; APIs are
enabled individually and remain enabled on destroy.

## Review and apply

Use Terraform 1.5+ and Google Cloud application default credentials belonging to
an administrator authorized to enable APIs, manage workload identity pools,
create service accounts, and update project and service account IAM policies.
The Service Usage API must already be enabled to manage project services. The
project must already be a Firebase project with the default runtime account and
Realtime Database instance; billing and the Cloud Functions build/service-agent
configuration must be ready. Existing resources with the same IDs must be
imported or their names changed before applying; do not manage the same IAM
member or service from multiple Terraform states.

The infra Makefile keeps local Terraform state, its backups, plan and provider
cache in `~/.local/state/ecoforest-github-deploy` by default. State and saved
plans can contain sensitive metadata or secrets. For shared use, configure an
encrypted, access-controlled remote backend with locking instead. Do not commit
state, plans, credentials, or `.terraform` directories.

```sh
gcloud auth application-default login
make -C infra plan
```

Inspect the plan and resolve any unexpected changes before explicitly applying it:

```sh
make -C infra apply
make -C infra output
```

`make -C infra deploy` is an alias for `apply`; both apply the previously saved
plan rather than creating a new one. Use the same `STATE_DIR` override on every
command if you need a different state location. Re-run `plan` to review changes
after modifying the configuration or state.

The checked-in `.terraform.lock.hcl` pins the provider for reproducible
initialization. No infrastructure is applied automatically. IAM changes can
take several minutes to propagate.

## Workflow integration

After applying, configure these repository variables under GitHub Settings >
Secrets and variables > Actions > Variables using the corresponding outputs:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`: `workload_identity_provider`
- `GCP_DEPLOYER_SERVICE_ACCOUNT`: `deployer_service_account_email`

The deploy workflow runs on pushes to `main` and deploys functions and database
rules. The separate pull request workflow runs tests without GCP credentials.
Merge the workflow only after the identity and variables are ready, or its first
deployment will fail. GitHub OIDC credentials are short-lived; verify the first
deployment works with federated ADC. Protect `main`, workflow changes and
dependencies: any eligible push workflow in this repository can impersonate the
deployer, not just a particular workflow. This provider rejects manual,
scheduled, pull-request and tag events. Concurrent deploys queue, but GitHub
does not guarantee their commit order.
