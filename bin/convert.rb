require 'optparse'
require 'csv'
require 'time'
require 'json'

require 'octokit'

class Commit
  attr_reader :date, :repo, :hash, :name

  def initialize(date:, repo:, hash:, name:)
    @date = date.is_a?(String) ? Time.parse(date) : date
    @repo = repo
    @hash = hash
    @name = name
    @grouped_time = {}
  end

  def time
    @date
  end

  def name_to_repo!
    @name = @repo
  end

  def grouped_time(type = 'weeks')
    return @grouped_time[type] if @grouped_time[type]

    if type == 'half_year'
      @grouped_time[type] = (@date.month <= 6 ? @date.strftime('Early %Y') : @date.strftime('Late %Y'))
    elsif type == 'months'
      @grouped_time[type] = @date.strftime('%Y年 %-m月')
    elsif type == 'weeks'
      week = @date.day / 7 + 1
      @grouped_time[type] = @date.strftime("%Y年 %-m月第#{week}週")
    elsif type == 'days'
      @grouped_time[type] = @date.strftime('%Y年 %-m月%-d日')
    else
      raise "Invalid type: #{type}"
    end
  end

  @@authors_cache = {}

  def author
    key = "#{@repo}-#{@hash}"

    unless @@authors_cache.has_key?(key)
      client = Octokit::Client.new(access_token: ENV['GITHUB_TOKEN'])
      @@authors_cache[key] = client.commit(@repo, @hash).author
    end

    @@authors_cache[key]
  end

  def name_with_avatar_img
    <<-"HTML"
      <div style="display: flex; align-items: center;">
        #{@name}
        <a href="#{author.html_url}" target="_blank">
          <img style="margin-left: 5px;" src="#{author.avatar_url}" width="15" height="15" />
        </a>
      </div>
    HTML
  end

  LINE_REGEXP = /^(?<date>\d\d\d\d-\d\d-\d\d)\t(?<repo>.+)\t(?<hash>.+)\t(?<name>.+)$/

  class << self
    # git log -n 100000000 --date short --pretty=format:"%ad %an" >commits.txt
    # yyyy-mm-dd name1
    # yyyy-mm-dd name2
    # ...
    def from_line(line)
      line.strip!

      if (matched = line.match(LINE_REGEXP))
        new(date: matched[:date], repo: matched[:repo], name: matched[:name], hash: matched[:hash])
      else
        warn "Invalid line: #{line}"
        nil
      end
    end

    def from_json(str)
      new(**JSON.parse(str, symbolize_names: true))
    rescue => e
      warn "Invalid json: #{str}"
      nil
    end
  end
end

def calc_stats(commits)
  warn "Commits: #{commits.size}"
  warn "Unique names: #{commits.uniq(&:name).size}"
end

def to_array(options)
  commits = []

  options['file'].split(',').each do |file|
    collection = []
    file.strip!

    File.open(file, 'rb').each_line do |line|
      collection << Commit.from_line(line)
    end

    collection.compact!
    collection.each(&:name_to_repo!) if options['name-to-repo']
    commits.concat(collection)

    warn "-- #{file} --"
    calc_stats(collection)
  end

  commits.compact!
  commits.sort_by!(&:time)
  warn "-- Total --"
  calc_stats(commits)

  time_range = Time.parse(options['since'])..Time.parse(options['until'])
  commits.select! { |c| time_range.include?(c.time) }
  warn "-- Filter by time --"
  calc_stats(commits)

  top_authors = commits.map(&:name).tally.sort_by { |_, c| -c }.take(options['limit']).to_h
  commits.select! { |c| top_authors[c.name] }
  warn "-- Filter by limit --"
  calc_stats(commits)

  grouped_times = commits.map(&:grouped_time).uniq
  csv_table = [['Name', *grouped_times]]

  commits.uniq(&:name).each do |commit|
    row = []

    grouped_times.each do |time|
      row << commits.count { |c| c.name == commit.name && c.grouped_time == time }
    end

    csv_table << [commit.name_with_avatar_img, *row]
  end

  csv_table
end

def to_csv(table)
  CSV.generate(force_quotes: true) do |data|
    table.each { |line| data << line }
  end
end

def to_json(ary, options)
  table = []
  headers = []
  total_count = Hash.new(0)

  ary.transpose.each.with_index do |row, i|
    if i == 0
      headers = row
      next
    end

    group = {options: {}, data: {}}

    headers.each do |header|
      if header == 'Name'
        group[:options] = {subtitle: {text: row[headers.index(header)].to_s}}
        group[:options][:title] = {text: options['title']} if options['title']
      else
        total_count[header] += row[headers.index(header)]
        group[:data][header.strip] = total_count[header]
      end
    end

    table << group
  end

  JSON.dump(table)
end

def main(options)
  ary = to_array(options)
  puts to_json(ary, options)
end

if __FILE__ == $0
  options = ARGV.getopts(
      'h',
      'file:',
      'since:',
      'until:',
      'limit:',
      'name-to-repo:',
      'title:',
  )
  options['since'] ||= '2022-01-01'
  options['until'] ||= '2022-12-31'
  options['limit'] = options['limit']&.to_i || 30
  options['name-to-repo'] = options['name-to-repo'] == 'true'
  warn "Options: #{options}"

  main(options)
end