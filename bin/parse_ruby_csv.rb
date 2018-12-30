require 'csv'
require 'json'

out = []
headers = []
total_count = Hash.new(0)

CSV.read(ARGV[0], headers: true).to_a.transpose.each.with_index do |row, i|
  if i == 0
    headers = row
    next
  end

  # next unless row[0].to_i == 1981 || row[0].to_i == 1982

  obj = {options: {}, values: [], categories: []}

  headers.each do |header|
    if header == 'Name'
      obj[:options] = {title: {text: 'Ruby core'}, subtitle: {text: row[headers.index(header)].to_s}}
    else
      total_count[header] += row[headers.index(header)].strip.delete(',').to_i
      obj[:values] << total_count[header]
      obj[:categories] << header.strip
    end
  end

  out << obj
end

puts JSON.dump(out)