set -e

for dir in $(ls -d ../tmp/*/); do
  cd $dir
  url=$(git config --get remote.origin.url)
  name=$(echo $url | ruby -e 'v = $stdin.read; r = v.include?("://") ? File.basename(Dir.getwd) : v.split(":")[1].gsub(/\.git/, ""); puts r')
  git log -n 100000000 --date short --pretty=format:"%ad %an" >commits.txt
  git log -n 100000000 --date short --pretty=format:"%ad $name" >repo_commits.txt
  echo "$dir $name $(wc -l <commits.txt) $(wc -l <repo_commits.txt)"
  cd ../
done

