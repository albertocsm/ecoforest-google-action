TERRAFORM ?= terraform
STACK := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))github-deploy
STATE_DIR ?= $(HOME)/.local/state/ecoforest-github-deploy
STATE := $(STATE_DIR)/terraform.tfstate
PLAN := $(STATE_DIR)/plan.tfplan
export TF_DATA_DIR := $(STATE_DIR)/data

.PHONY: init validate plan apply deploy output

init:
	umask 077; mkdir -p "$(TF_DATA_DIR)"
	$(TERRAFORM) -chdir="$(STACK)" init -input=false -lockfile=readonly

validate: init
	$(TERRAFORM) -chdir="$(STACK)" fmt -check
	$(TERRAFORM) -chdir="$(STACK)" validate

plan: validate
	umask 077; $(TERRAFORM) -chdir="$(STACK)" plan -state="$(STATE)" -out="$(PLAN)"

apply: init
	umask 077; $(TERRAFORM) -chdir="$(STACK)" apply -state="$(STATE)" "$(PLAN)"

deploy: apply

output: init
	$(TERRAFORM) -chdir="$(STACK)" output -state="$(STATE)"
