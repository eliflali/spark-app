require 'xcodeproj'

project_path = 'ios/Spark.xcodeproj'
project = Xcodeproj::Project.open(project_path)

target = project.targets.find { |t| t.name == 'Spark' }
group = project.main_group.groups.find { |g| g.name == 'Spark' || g.path == 'Spark' }

files_to_add = [
  'ios/Spark/SparkWidgetModule.h',
  'ios/Spark/SparkWidgetModule.m',
  'ios/Spark/WidgetDataBridge.swift'
]

# 1. Clean up bad references again
['SparkWidgetModule.h', 'SparkWidgetModule.m', 'WidgetDataBridge.swift'].each do |name|
  bad_refs = group.files.select { |f| f.name == name || f.path == name || f.path == "Spark/#{name}" }
  bad_refs.each do |ref|
    target.source_build_phase.remove_file_reference(ref)
    ref.remove_from_project
    puts "Removed bad ref: #{ref.path || ref.name}"
  end
end

# 2. Add them properly with the relative path inside the group
files_to_add.each do |file_path|
  file_name = File.basename(file_path)
  
  # The group's real_path is `ios/`. The files are in `ios/Spark/`.
  # Thus, relative to the group, the path is `Spark/filename`.
  relative_path = "Spark/#{file_name}"
  
  file_ref = group.new_reference(relative_path)
  
  if file_name.end_with?('.m', '.swift')
    target.source_build_phase.add_file_reference(file_ref)
    puts "Added proper compile ref to target: #{relative_path} with real_path #{file_ref.real_path}"
  else
    puts "Added proper header ref to group: #{relative_path} with real_path #{file_ref.real_path}"
  end
end

project.save
puts "Successfully saved project!"
