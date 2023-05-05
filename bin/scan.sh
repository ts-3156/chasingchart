#!/bin/bash

set -e

# Example: ./scan.sh ../repos

if [ -d ${1}/.git ]; then
  dirs=${1}
else
  dirs=$(ls -d ${1}/*)
fi

for dir in $dirs; do
  if [[ $(basename $dir) == _* ]]; then
    echo "Skip ${dir}"
    continue
  fi

  cd $dir

  url=$(git config --get remote.origin.url)
  repo=$(echo $url | ruby -e 'v = $stdin.read; r = v.include?("://") ? File.basename(Dir.getwd) : v.split(":")[1].gsub(/\.git/, ""); puts r')
  git log -n 100000000 --date short --pretty=format:"%ad%x09$repo%x09%an" >commits.txt
  #  git log -n 100000000 --date short --pretty=format:"{\"date\": \"%ad\", \"repo\": \"$repo\", \"hash\": \"%t\", \"author\": \"%an\"}" >commits.txt
  git log -n 100000000 --date short --pretty=format:"%ad $repo" >repo_commits.txt
  echo "$dir $repo $(wc -l <commits.txt) $(wc -l <repo_commits.txt)"

  cd ../
done
