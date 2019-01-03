require 'csv'
require 'json'

table = []
headers = []
total_count = Hash.new(0)

CSV.read(ARGV[0], headers: true).to_a.transpose.each.with_index do |row, i|
  if i == 0
    headers = row
    next
  end

  obj = {options: {}, data: {}}

  headers.each do |header|
    if header == 'Name'
      obj[:options] = {title: {text: 'Ruby commits'}, subtitle: {text: row[headers.index(header)].to_s}}
    else
      total_count[header] += row[headers.index(header)].strip.delete(',').to_i
      obj[:data][header.strip] = total_count[header]
    end
  end

  table << obj
end

puts JSON.dump(table)
