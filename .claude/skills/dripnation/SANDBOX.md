# Drip Nation Sandbox Policy

## Principle

Development tools should operate within the project boundary by default.

Project:

`/home/adhiraj-singh/arghy/project/drip`

## Allowed

- repository source
- project documentation
- project tests
- project migrations
- project assets
- project build artifacts

## Restricted

Treat these as sensitive:

- `.env.local`
- credentials
- private keys
- deployment tokens
- production credentials

Never expose their contents in output.

## External Systems

Production systems are not development sandboxes.

Never assume permission to:

- modify production database
- deploy production
- delete cloud resources
- rotate credentials
- change payment configuration

These require explicit authorization.

## Database

Development and production environments must be separated.

Never use production credentials as ordinary local development credentials.

## Git

Never assume permission for:

- force push
- history rewrite
- destructive reset
- destructive clean
