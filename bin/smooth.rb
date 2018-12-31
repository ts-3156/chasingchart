def smooth(obj1, obj2, split_threshold: 24, split_num: 12)
  avg1 = obj1[:data].values.sum / obj1[:data].length
  avg2 = obj2[:data].values.sum / obj2[:data].length

  if (avg1 - avg2).abs < split_threshold
    return [obj1, obj2]
  end

  smoothed = []

  split_num.times do |loop_i|
    data = {}

    obj1[:data].each do |category1, value1|
      obj2[:data].each do |category2, value2|
        if category1 == category2
          diff = (loop_i + 1).to_f * (value1 - value2).abs / split_num
          data[category1] = (value1 < value2) ? value1 + diff : value2 - diff
        end
      end
    end

    smoothed << {options: obj1[:options], data: data}
  end

  [obj1, *smoothed, obj2]
end
