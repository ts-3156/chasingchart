require 'time'

values = []

while line = ARGF.gets
  m = line.match %r{^(?<date>\d\d\d\d-\d\d-\d\d) (?<name>\w+)[^\w]}
  if m
    values << [Time.parse(m[:date]), m[:name].gsub(/[,_]/, '_')]
  else
    warn "#{line} #{m.inspect}"
  end
end

values = values.select {|time, name| time.year >= 1900}
             .sort_by {|(time, name)| time.to_i}
             .map {|time, name| [time.month <= 6 ? time.strftime('Early %Y') : time.strftime('Late %Y'), name]}

names = values.map {|month, name| name}.each_with_object(Hash.new(0)) {|n, count| count[n] += 1}
names = names.select {|n, c| c >= 1}.map {|n, c| n}.uniq.sort
warn 'Names: ' + names.size.to_s

months = values.map {|month, name| month}.uniq

table = []
table << ['Name', *months]

names.each.with_index do |name, i|
  row = []

  months.each do |month|
    row << values.count {|_month, _name| month == _month && name == _name}
  end

  table << [name, *row]
end

table.each do |row|
  puts row.join(',')
end
