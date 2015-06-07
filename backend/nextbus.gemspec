# -*- encoding: utf-8 -*-
# vim: ft=ruby

require File.expand_path('../lib/nextbus/version', __FILE__)

Gem::Specification.new do |gem|
  gem.authors       = ['SET ME']
  gem.email         = ['SET ME']
  gem.licenses      = ['MIT']
  gem.description   = 'I am an application stub'
  gem.summary       = 'app stub'

  gem.files         = `git ls-files`.split($OUTPUT_RECORD_SEPARATOR)
  gem.executables   = gem.files.grep(/^bin\//).map { |f| File.basename(f) }
  gem.test_files    = gem.files.grep(/^(test|spec|features)\//)
  gem.name          = 'nextbus'
  gem.require_paths = %w(lib)
  gem.version       = Nextbus::VERSION
  # dependencies...
  gem.add_dependency('sysexits', '1.0.2')
  gem.add_dependency('awesome_print', '~> 1.1.0')
  gem.add_dependency('abstract_type', '~> 0.0.7')
  gem.add_dependency('multi_json', '~> 1.10.1')
  gem.add_dependency('hashie', '~> 3.4.2')
  gem.add_dependency('c_geohash', '~> 1.1.2')

  # development dependencies.
  gem.add_development_dependency('nori')
  gem.add_development_dependency('activesupport')
end

