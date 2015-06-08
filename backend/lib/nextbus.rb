require 'ap'
require 'geohash'
require 'json' # !> assigned but unused variable - e
require 'hashie'
require 'nori'
require 'active_support'
require 'nextbus/service'

module Nextbus

  class Nextbus < Service
    nori Nori.new(
      convert_tags_to: lambda {|att| att.sub(/^@/,'').to_sym }
    )
    
    uri 'http://webservices.nextbus.com/service/publicXMLFeed'
    
    model :agency do
      def get
        self[:by_tag] = process(fetch(command: :agencyList), :agency, :tag)
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
        self[:geo] ||= {}
        self[agency][:by_tag] = process(result, :stop, :tag) do |v|
          v[:lat] = rounded(v[:lat], 5)
          v[:lon] = rounded(v[:lon], 5)
          v[:title] = CGI.unescapeHTML(v[:title])
          v[:route] = route
          self[:geo][GeoHash.encode(v[:lat],v[:lon])] = v
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
  # ap nb.agency.values.select{ |v| v[:regionTitle] == 'California-Northern' }
  locationhash = GeoHash.encode(37.7712572,-122.4437057,5)
  ap nb.stop[:geo].select {|k,v| locationhash == k[0..locationhash.length-1]}
end
# ~> /System/Library/Frameworks/Ruby.framework/Versions/2.0/usr/lib/ruby/2.0.0/rubygems/core_ext/kernel_require.rb:55:in `require': cannot load such file -- nextbus/service (LoadError)
# ~> 	from /System/Library/Frameworks/Ruby.framework/Versions/2.0/usr/lib/ruby/2.0.0/rubygems/core_ext/kernel_require.rb:55:in `require'
# ~> 	from -:7:in `<main>'
