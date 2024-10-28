require 'optparse'
require 'csv'
require 'time'
require 'json'

require 'octokit'

class Avatar
  def initialize(author)
    @author = author
  end

  def to_html(name)
    <<-"HTML"
      <div style="display: flex; align-items: center;">
        #{name} (@#{@author.login})
        <a href="#{@author.html_url}" target="_blank">
          <img style="margin-left: 5px;" src="#{@author.avatar_url}" width="15" height="15" />
        </a>
      </div>
    HTML
  end
end

class GithubClient
  def initialize(access_token)
    @client = Octokit::Client.new(access_token: access_token)
    @cache = {}
  end

  def author(repo, hash)
    key = "#{repo}-#{hash}"

    unless @cache.has_key?(key)
      @cache[key] = @client.commit("#{repo}", hash).author
    end

    @cache[key]
  end
end

class Commit
  attr_reader :date, :hash, :name

  def initialize(date:, hash:, name:)
    @date = date.is_a?(String) ? Time.parse(date) : date
    @hash = hash
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

  LINE_REGEXP = /^(?<date>\d\d\d\d-\d\d-\d\d)\t(?<hash>\w+)\t(?<name>.+)$/

  class << self
    # git log -n 100000000 --date short --pretty=format:"%ad%x09%h%x09%an" >commits.txt
    # yyyy-mm-dd hash name
    # yyyy-mm-dd hash name
    # ...
    def from_line(line)
      line.strip!

      if (matched = line.match(LINE_REGEXP))
        new(date: matched[:date], name: matched[:name], hash: matched[:hash])
      else
        warn "Invalid line: #{line}"
        nil
      end
    end

    def from_files(str)
      str.split(',').map do |file|
        from_file(file)
      end.flatten
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

def extract_commits(options)
  commits = Commit.from_files(options['file'])
  commits.sort_by!(&:time)
  commits
end

def filter_commits(commits, options)
  time_range = Time.parse(options['since'])..Time.parse(options['until'])
  commits.select! { |c| time_range.include?(c.time) }

  top_authors = commits.map(&:name).tally.sort_by { |_, c| -c }.take(options['limit']).to_h
  commits.select! { |c| top_authors[c.name] }
  commits
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
    author = github.author(options['repo'], commit.hash)
    Avatar.new(author).to_html(commit.name)
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
      'repo:',
  )
  options['since'] ||= '2022-01-01'
  options['until'] ||= '2022-12-31'
  options['limit'] = options['limit']&.to_i || 30

  main(options)
end