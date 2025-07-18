#!/bin/bash

# Prompt for commit message
read -p "Enter commit message: " commit_message

# Execute git commands with the provided message
git add .
git commit -m "$commit_message"
git push origin main
