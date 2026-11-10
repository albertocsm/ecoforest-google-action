.PHONY: build install test deploy

build: install
	$(MAKE) test

install:
	npm --prefix functions ci

test:
	npm --prefix functions test

deploy: build
	firebase deploy --only functions,database $(if $(PROJECT),--project $(PROJECT))
