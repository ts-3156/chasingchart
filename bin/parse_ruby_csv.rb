require 'csv'
require 'json'

$LOAD_PATH.unshift(File.expand_path("../", __FILE__))
require 'smooth'

table = []
headers = []
total_count = Hash.new(0)

CSV.read(ARGV[0], headers: true).to_a.transpose.each.with_index do |row, i|
  if i == 0
    headers = row
    next
  end

  # next unless row[0].to_i == 1981 || row[0].to_i == 1982

  obj = {options: {}, data: {}}

  headers.each do |header|
    if header == 'Name'
      obj[:options] = {title: {text: 'Ruby core'}, subtitle: {text: row[headers.index(header)].to_s}}
    else
      total_count[header] += row[headers.index(header)].strip.delete(',').to_i
      obj[:data][header.strip] = total_count[header]
    end
  end

  table << obj
end

tbl = []

# table.each_cons(2) do |obj1, obj2|
#   ary = smooth(obj1, obj2)
#   tbl.concat(ary)
# end

puts JSON.dump(table)
