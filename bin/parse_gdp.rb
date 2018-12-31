require 'csv'
require 'json'

$LOAD_PATH.unshift(File.expand_path("../", __FILE__))
require 'smooth'

table = []

headers = []

CSV.read(ARGV[0], headers: true).to_a.transpose.each.with_index do |row, i|
  if i == 0
    headers = row
    next
  end

  # next unless row[0].to_i == 1981 || row[0].to_i == 1982

  obj = {options: {}, data: {}}

  headers.each do |header|
    if header == 'Country'
      obj[:options] = {title: {text: 'Gross Domestic Product (GDP)'}, subtitle: {text: row[headers.index(header)].to_s}}
    else
      obj[:data][header.strip] = row[headers.index(header)].strip.delete(',').to_i
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
