require 'csv'
require 'json'

$LOAD_PATH.unshift(File.expand_path("../", __FILE__))
require 'smooth'

table = []

CSV.foreach(ARGV[0], headers: true) do |row|
  obj = {options: {}, data: {}}

  row.headers.each do |header|
    if header == 'Year'
      obj[:options] = {title: {text: 'The number of tourists to Japan'}, subtitle: {text: row[header]}}
    else
      obj[:data][header.strip] = row[header].strip.delete(',').to_i
    end
  end

  table << obj
end

tbl = []

table.each_cons(2) do |obj1, obj2|
  ary = smooth(obj1, obj2)
  tbl.concat(ary)
end

puts JSON.dump(tbl)
