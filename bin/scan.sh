#!/bin/bash

set -e

# Example: ./scan.sh ../repos

for dir in $(ls -d ${1}/*); do
  if [[ $(basename $dir) == _* ]]; then
    echo "Skip ${dir}"
    continue
  fi

  cd $dir

  url=$(git config --get remote.origin.url)
  repo=$(echo $url | ruby -e 'v = $stdin.read; r = v.include?("://") ? File.basename(Dir.getwd) : v.split(":")[1].gsub(/\.git/, ""); puts r')
  git log -n 100000000 --date short --pretty=format:"%ad %an" >commits.txt
  #  git log -n 100000000 --date short --pretty=format:"{\"date\": \"%ad\", \"repo\": \"$repo\", \"hash\": \"%t\", \"author\": \"%an\"}" >commits.txt
  git log -n 100000000 --date short --pretty=format:"%ad $repo" >repo_commits.txt
  echo "$dir $repo $(wc -l <commits.txt) $(wc -l <repo_commits.txt)"

  cd ../
done
