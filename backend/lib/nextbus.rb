require 'ap'
require 'geohash'
require 'json' # !> assigned but unused variable - e
require 'hashie'
require 'nori'
require 'active_support'
require 'nextbus/service'
require 'rbtree'

module Nextbus

  class Nextbus < Service
    nori Nori.new(
      convert_tags_to: lambda {|att| att.sub(/^@/,'').to_sym }
    )
    
    uri 'http://webservices.nextbus.com/service/publicXMLFeed'
    
    model :agency do
      def get
        self[:by_tag] = process(fetch(command: :agencyList), :agency, :tag)
        self[:by_region] ||= {}
        self[:by_tag].each do |t,v|
          self[:by_region][v[:regionTitle]] = Array(self[:by_region][v[:regionTitle]]) << v
	end
      end
    end
        
    model :route do
      def get(agency)
        result = fetch(command: :routeList, a: agency)
        self[:by_tag] = process(result, :route, :tag, agency: agency)
      end
    end
    
    model :message do
      def get(agency, route)
        result = fetch(command: :messages, a: agency, r: route)
        self[agency] ||= {}
        self[agency][:by_id] = process(result, :message, :id, route: route)
      end
    end
    
    model :stop do
      def rounded(number, digits)
        scale = 10 ** digits
        (number.to_f * scale + 0.5).to_i.to_f/scale
      end
      
      def get(agency, route)
        result = fetch(command: :routeConfig, a: agency, r: route)
        self[agency] ||= {}
        self[:geo] ||= MultiRBTree.new
        self[agency][:by_tag] = process(result, :stop, :tag) do |v|
          v[:lat] = v[:lat].to_f # rounded(v[:lat], 5)
          v[:lon] = v[:lon].to_f # rounded(v[:lon], 5)
          v[:title] = CGI.unescapeHTML(v[:title])
          v[:route] = route
          v[:hash] = GeoHash.encode(v[:lat],v[:lon])
          self[:geo][v[:hash]] = v
        end
        self[agency][route] = process(result, :direction, :name) do |v|
          # Link the stops to the by_tag hash
          v[:stop].map! do |s|
            s = self[agency][:by_tag][s[:tag]]
          end
        end
      end
    end
  end
  
  nb = Nextbus.new
  nb.agency.get
  nb.route.get 'sf-muni' # => 
  nb.message.get 'sf-muni', '7'
  nb.stop.get 'sf-muni', '7'
  regions = nb.agency[:by_region].keys.sort
  location = GeoHash.new(37.753895,-122.4888, precision=7)
  location = GeoHash.new(37.784602,-122.407329, precision=7)
  (location.neighbors << location.to_s).each do |k|
    nb.stop[:geo].bound(k, k+'zzzzzzz').each do |g,v|
      ap v
    end
  end
end
# ~> /System/Library/Frameworks/Ruby.framework/Versions/2.0/usr/lib/ruby/2.0.0/rubygems/core_ext/kernel_require.rb:55:in `require': cannot load such file -- nextbus/service (LoadError)
# ~> 	from /System/Library/Frameworks/Ruby.framework/Versions/2.0/usr/lib/ruby/2.0.0/rubygems/core_ext/kernel_require.rb:55:in `require'
# ~> 	from -:7:in `<main>'
