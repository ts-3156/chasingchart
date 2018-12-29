require 'csv'
require 'json'

out = []

CSV.foreach(ARGV[0], headers: true) do |row|
  obj = {options: {}, values: [], categories: []}

  row.headers.each do |header|
    if header == 'Year'
      obj[:options] = {title: {text: 'The number of tourists to Japan'}, subtitle: {text: row[header]}}
    else
      obj[:values] << row[header].strip.delete(',').to_i
      obj[:categories] << header.strip
    end
  end

  out << obj
end

puts JSON.dump(out)