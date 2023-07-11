# Archive NodeBB Forums to MediaWiki

## Goal

This projects goal is to archive our corporations forum to our wiki.

The reasons for this are:
* we want to get rid of our old hosting environment and would require a new one
* NodeBB requires regular updates and maintenance where we do not have any volunteers for at the moment
* It has a customized authentication module for EvE-SSO which causes several issues and would require severe bugfixing
* The forums faced a decline of user acceptance over the last years so it becomes less important
* We try to gather the forums functionality on Discord, so we reduce the number of systems people have to cover


## Step I
In the first step, we import the MongoDB bson-files into an Azure CosmosDB.

