require 'geohash'
require 'json'
#require 'hashie'
require 'nori'
require 'nextbus/service'
require 'rbtree'

module Nextbus
  # Nextbus Service, uses Service DSL.
  class Nextbus < Service
    # Our Nori XML Parsing rules
    nori Nori.new(
      convert_tags_to: lambda {|att| att.sub(/^@/,'').to_sym }
    )

    # The endpoint for the service
    uri 'http://webservices.nextbus.com/service/publicXMLFeed'

    model :agency do
      def get
        self[:by_tag] = process(fetch(command: :agencyList), :agency, :tag)
        self[:by_region] ||= {}
        self[:by_tag].each do |t,v|
          self[:by_region][v[:regionTitle]] = Array(self[:by_region][v[:regionTitle]]) << v
	      end
        self
      end
    end

    model :route do
      def get(agency)
        result = fetch(command: :routeList, a: agency)
        self[agency] ||= {}
        self[agency][:by_tag] = process(result, :route, :tag, agency: agency) do |v|
          v[:title] = CGI.unescapeHTML(v[:title])
        end
        self
      end

      def index_directions(agency)
        self[agency][:by_tag].values.each do |s|
          s[:direction].each do |d|
            self[d[:tag]] = s
          end
        end
        self
      end
    end

    model :message do
      def get(agency, route)
        result = fetch(command: :messages, a: agency, r: route)
        self[agency] ||= {}
        self[agency][:by_id] = process(result, :message, :id, route: route)
        self
      end
    end

    model :stop do
      def get(route)
        result = fetch(command: :routeConfig, a: route[:agency], r: route[:tag])
        # Storing in a RedBlack tree gives us sorted keys and bounding searches
        self[:geo] ||= MultiRBTree.new
        self[route[:agency]] ||= {}
        self[route[:agency]][:by_tag] ||= {}
        resulthash = process(result, :stop, :tag) do |v|
          v[:lat] = v[:lat].to_f # rounded(v[:lat], 5)
          v[:lon] = v[:lon].to_f # rounded(v[:lon], 5)
          v[:title] = CGI.unescapeHTML(v[:title])
          v[:route] = []
          v[:hash] = GeoHash.encode(v[:lat],v[:lon])
          self[:geo][v[:hash]] ||= v
        end
        self[route[:agency]][:by_tag].merge!(resulthash) do |k, old, new|
#          old[:route] = Array(old[:route]) << new[:route]
          old
        end
        self[route[:agency]][route[:tag]] = process(result, :direction, :name) do |v|
          # Link the stops to the by_tag hash
          v[:title] = CGI.unescapeHTML(v[:title])
          route[:direction] = Array(route[:direction]) << {tag: v[:tag], title: v[:title], name: v[:name]}
          v[:stop].map! do |s|
            s = self[route[:agency]][:by_tag][s[:tag]]
            s[:route] <<= v[:tag]
          end
        end
        self
      end

      def near(lat, lon)
        location = GeoHash.new(lat,lon, precision=7)
          # Self and Neighbors
        (Array(location.to_s)+location.neighbors).map do |prefix|
          # All sub-boxes
          self[:geo].bound(prefix, prefix+'zzzzzzz').map {|k,v| v}
        end.flatten
      end
    end
  end
end
