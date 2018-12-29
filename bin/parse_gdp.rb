require 'csv'
require 'json'

out = []

headers = []

CSV.read(ARGV[0], headers: true).to_a.transpose.each.with_index do |row, i|
  if i == 0
    headers = row
    next
  end

  obj = {options: {}, values: [], categories: []}

  headers.each do |header|
    if header == 'Country'
      obj[:options] = {title: {text: 'Gross Domestic Product (GDP)'}, subtitle: {text: row[headers.index(header)].to_s}}
    else
      obj[:values] << row[headers.index(header)].strip.delete(',').to_i
      obj[:categories] << header.strip
    end
  end

  out << obj
end

puts JSON.dump(out)