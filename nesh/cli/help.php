<?php
echo <<<TEXT
IELECTRO NESH HELP
============================
USAGE
  php nesh <application> <command> [arguments]
  php nesh <command>
GLOBAL COMMANDS
  install                   Install NESH.
  domain <URL>              Configure deployment URLs for all applications.
  db --all <database>       Set the same database for every application that uses one.
  db <application> <db>     Change the database for one application.
  version                   Display the framework version.
  help                      Display this help page.
APPLICATION COMMANDS
  <application> build       Execute database migrations.
  <application> backup      Create a backup.
  <application> backups     List available backups.
  <application> restore     Restore a backup.
APPLICATION MANAGEMENT
  <application> create      Create a new application.
  <application> rename      Rename an application.
  <application> delete      Delete an application.
RESOURCES
  create page               php nesh <application> create page <name>
  create component          php nesh <application> create component <name>
  create api                php nesh <application> create api <name>
  create service            php nesh <application> create service <name>
  create database           php nesh <application> create database <name>
  rename page               php nesh <application> rename page <old> <new>
  rename component          php nesh <application> rename component <old> <new>
  rename api                php nesh <application> rename api <old> <new>
  rename service            php nesh <application> rename service <old> <new>
  rename database           php nesh <application> rename database <old> <new>
  delete page               php nesh <application> delete page <name>
  delete component          php nesh <application> delete component <name>
  delete api                php nesh <application> delete api <name>
  delete service            php nesh <application> delete service <name>
  delete database           php nesh <application> delete database <name>
TEXT;