require 'optparse'
require 'csv'
require 'time'
require 'json'

class Commit
  attr_reader :time, :name

  def initialize(time, name)
    @time = time
    @name = name
    @grouped_time = {}
  end

  def grouped_time(type = 'each_month')
    return @grouped_time[type] if @grouped_time[type]

    if type == 'half_year'
      @grouped_time[type] = (@time.month <= 6 ? @time.strftime('Early %Y') : @time.strftime('Late %Y'))
    elsif type == 'each_month'
      @grouped_time[type] = @time.strftime('%Y年 %-m月')
    else
      raise "Invalid type: #{type}"
    end
  end

  REGEXP = /^(?<date>\d\d\d\d-\d\d-\d\d) (?<name>.+)/

  class << self
    # git log -n 100000000 --date short --pretty=format:"%ad %an" >commits.txt
    # yyyy-mm-dd name1
    # yyyy-mm-dd name2
    # ...
    def from_line(line)
      if (matched = line.match(REGEXP))
        new(Time.parse(matched[:date]), matched[:name])
      else
        raise "Invalid line: #{line}"
      end
    end
  end
end

def to_array(options)
  commits = []

  File.read(options['in']).each_line do |line|
    commits << Commit.from_line(line)
  end

  commits.sort_by!(&:time)
  warn "Commits: #{commits.size}"

  time_range = Time.parse(options['since'])..Time.parse(options['until'])
  commits.select! { |c| time_range.include?(c.time) }
  warn "Specified-time commits: #{commits.size}"

  # names_hash = commits.map(&:name).tally.select { |_, c| c >= options['min_count'] }
  # commits.select! { |c| names_hash[c.name] }
  # warn "Multiple commits: #{commits.size}"

  top_authors = commits.map(&:name).tally.sort_by { |_, c| -c }.take(options['top_n']).to_h
  commits.select! { |c| top_authors[c.name] }
  warn "Top-author's commits: #{commits.size}"

  grouped_times = commits.map(&:grouped_time).uniq
  csv_table = [['Name', *grouped_times]]

  commits.map(&:name).uniq.each do |name|
    row = []

    grouped_times.each do |time|
      row << commits.count { |c| c.name == name && c.grouped_time == time }
    end

    csv_table << [name, *row]
  end

  csv_table
end

def to_csv(table)
  CSV.generate(force_quotes: true) do |data|
    table.each { |line| data << line }
  end
end

def to_json(csv)
  table = []
  headers = []
  total_count = Hash.new(0)

  csv.transpose.each.with_index do |row, i|
    if i == 0
      headers = row
      next
    end

    obj = {options: {}, data: {}}

    headers.each do |header|
      if header == 'Name'
        obj[:options] = {title: {text: 'Commits'}, subtitle: {text: row[headers.index(header)].to_s}}
      else
        total_count[header] += row[headers.index(header)]
        obj[:data][header.strip] = total_count[header]
      end
    end

    table << obj
  end

  JSON.dump(table)
end

def main(options)
  ary = to_array(options)
  puts to_json(ary)
end

if __FILE__ == $0
  options = ARGV.getopts(
      'h',
      'in:',
      'out:',
      'since:',
      'until:',
      'min_count:',
      'top_n:',
  )
  options['since'] ||= '2022-01-01'
  options['until'] ||= '2022-12-31'
  options['min_count'] = options['min_count']&.to_i || 2
  options['top_n'] = options['top_n']&.to_i || 30
  warn "Options: #{options}"

  main(options)
end