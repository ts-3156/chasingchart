require 'optparse'
require 'csv'
require 'time'
require 'json'
require 'erb'

require 'active_support'
require 'faraday/http_cache'
require 'octokit'

class Faraday::HttpCache::Response
  def fresh?
    true
  end
end

class Avatar
  def initialize(author)
    @author = author
  end

  AVATAR_URLS = {
      'ruby' => 'https://avatars.githubusercontent.com/u/210414?v=4',
      'python' => 'https://avatars.githubusercontent.com/u/1525981?v=4',
      'php' => 'https://avatars.githubusercontent.com/u/25158?s=200&v=4',
      'java' => 'https://avatars.githubusercontent.com/u/41768318?s=200&v=4',
      'perl' => 'https://avatars.githubusercontent.com/u/3585411?s=200&v=4',
      'rust' => 'https://avatars.githubusercontent.com/u/5430905?s=48&v=4',
      'go' => 'https://avatars.githubusercontent.com/u/4314092?s=48&v=4',
      'swift' => 'https://avatars.githubusercontent.com/u/42816656?s=200&v=4',
      'kotlin' => 'https://avatars.githubusercontent.com/u/878437?s=200&v=4',
      'nodejs' => 'https://avatars.githubusercontent.com/u/9950313?s=200&v=4',
  }

  TEMPLATE = <<-"HTML"
      <div style="display: flex; align-items: center;">
        <%= login %>
        <span>
          <img style="margin-left: 5px;" src="<%= org_avatar_url %>" width="15" height="15" alt="__<%= lang %>__" />
        </span>
        <a href="<%= html_url %>" target="_blank">
          <img style="margin-left: 5px;" src="<%= avatar_url %>" width="15" height="15" />
        </a>
      </div>
  HTML

  def to_html(name, lang)
    ERB.new(TEMPLATE).result_with_hash(
        login: @author.login,
        org_avatar_url: AVATAR_URLS[lang],
        lang: lang,
        html_url: @author.html_url,
        avatar_url: @author.avatar_url
    )
  end
end

class GithubClient

  LANG_TO_REPO = {
      'ruby' => 'ruby/ruby',
      'python' => 'python/cpython',
      'php' => 'php/php-src',
      'java' => 'openjdk/jdk',
      'perl' => 'Perl/perl5',
      'rust' => 'rust-lang/rust',
      'go' => 'golang/go',
      'swift' => 'swiftlang/swift',
      'kotlin' => 'JetBrains/kotlin',
      'nodejs' => 'nodejs/node',
  }

  def initialize(access_token)
    Octokit.middleware = Faraday::RackBuilder.new do |builder|
      builder.use :http_cache, store: ActiveSupport::Cache.lookup_store(:file_store, 'github-cache'), shared_cache: false
      builder.use Octokit::Response::RaiseError
      builder.adapter Faraday.default_adapter
    end

    @client = Octokit::Client.new(access_token: access_token)
  end

  def author(repo, hash)
    repo = LANG_TO_REPO[repo] if LANG_TO_REPO.has_key?(repo)
    @client.commit(repo, hash).author
  end
end

class BlankAuthor
  def initialize(name)
    @name = name
  end

  def login
    @name
  end

  def html_url
    ''
  end

  def avatar_url
    'https://github.githubassets.com/images/gravatars/gravatar-user-420.png?size=40'
  end
end

class Commit
  attr_reader :date, :hash, :lang, :name

  def initialize(date:, hash:, lang:, name:)
    @date = date.is_a?(String) ? Time.parse(date) : date
    @hash = hash
    @lang = lang
    @name = name
    @grouped_time = {}
  end

  def time
    @date
  end

  def grouped_time(type = 'weeks')
    return @grouped_time[type] if @grouped_time[type]
    @grouped_time[type] = self.class.grouped_time(@date, type)
  end

  LINE_REGEXP = /^(?<date>\d\d\d\d-\d\d-\d\d)\t(?<lang>\w+)\t(?<hash>\w+)\t(?<name>.*)$/

  class << self
    # git log -n 100000000 --date short --pretty=format:"%ad%x09__lang__%x09%h%x09%an" >commits.txt
    # yyyy-mm-dd hash name
    # yyyy-mm-dd hash name
    # ...
    def from_line(line)
      line.delete!("\n$")

      if (matched = line.match(LINE_REGEXP))
        new(date: matched[:date], name: matched[:name] || 'noname', lang: matched[:lang], hash: matched[:hash])
      else
        warn "Invalid line: (#{line}) matched=#{matched.inspect}"
        nil
      end
    end

    def from_file(file)
      File.open(file.strip, 'rb').each_line.map do |line|
        from_line(line)
      end.compact
    end

    def grouped_time(time, type = 'weeks')
      case type
      when 'half_year' then
        time.month <= 6 ? time.strftime('Early %Y') : time.strftime('Late %Y')
      when 'months' then
        time.strftime('%Y年 %-m月')
      when 'weeks' then
        # time.strftime("%Y年 %-m月第#{time.day / 7 + 1}週")
        time.strftime("%Y-%-m #{time.day / 7 + 1}")
      when 'days' then
        # time.strftime('%Y年 %-m月%-d日')
        time.strftime('%Y-%-m-%-d')
      when 'yday' then
        time.yday
      when 'yweek' then
        time.yday / 7 + 1
      else
        raise "Invalid type: #{type}"
      end
    end
  end
end

def limit_commits(commits, limit)
  authors = commits.map(&:name).tally.sort_by { |_, c| -c }.take(limit).to_h
  commits.select { |c| authors[c.name] }
end

def extract_commits(options)
  commits = []

  options['file'].split(',').each do |file|
    ary = Commit.from_file(file)
    ary = limit_commits(ary, options['limit-by-file'])
    commits.concat(ary)
  end

  commits.sort_by(&:time)
end

def filter_commits(commits, options)
  time_range = Time.parse(options['since'])..Time.parse(options['until'])
  commits.select! { |c| time_range.include?(c.time) }
  limit_commits(commits, options['limit'])
end

def format_commits(commits, options)
  time_type = 'yweek'
  grouped_times =
      Date.parse(options['since']).upto(Date.parse(options['until'])).map do |date|
        Commit.grouped_time(date, time_type)
      end
  default_values = grouped_times.map { |t| [t, 0] }.to_h

  count_by_grouped_time = commits.map(&:name).uniq.map do |name|
    [name, default_values.dup]
  end.to_h

  commits.each do |commit|
    count_by_grouped_time[commit.name][commit.grouped_time(time_type)] += 1
  end

  count_by_grouped_time.map do |name, obj|
    ary_obj = obj.to_a
    accumulated_count = {}
    ary_obj.each.with_index do |(day, _), i|
      accumulated_count[day] = ary_obj[0, i + 1].map { |_, c| c }.sum
    end

    [name, accumulated_count]
  end.to_h
end

def main(options)
  commits = extract_commits(options)
  commits = filter_commits(commits, options)
  result = format_commits(commits, options)

  github = GithubClient.new(ENV['GITHUB_TOKEN'])

  result.transform_keys! do |key|
    commit = commits.find { |c| c.name == key }
    author = github.author(commit.lang, commit.hash) ||
        BlankAuthor.new(commit.name)
    Avatar.new(author).to_html(commit.name, commit.lang)
  end

  puts JSON.dump(result)
end

if __FILE__ == $0
  options = ARGV.getopts(
      'h',
      'file:',
      'since:',
      'until:',
      'limit:',
      'limit-by-file:',
      'repo:',
  )
  options['since'] ||= '2022-01-01'
  options['until'] ||= '2022-12-31'
  options['limit'] = options['limit']&.to_i || 30
  options['limit-by-file'] = options['limit-by-file']&.to_i || 30

  main(options)
end