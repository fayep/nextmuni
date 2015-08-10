require 'json'
require 'nextbus/nextbus'
require 'benchmark'

class NextBusApp
  def initialize
    @nb = Nextbus::Nextbus.new
    @nb.agency.get
    agency = 'sf-muni'
    @nb.route.get agency # =>
    @nb.route[agency][:by_tag].values.each { |r| @nb.stop.get r }
    @nb.route.index_directions(agency)
    regions = @nb.agency[:by_region].keys.sort
  end

#  location = GeoHash.new(37.753895,-122.4888, precision=7)
#  location = GeoHash.new(37.784602,-122.407329, precision=7)
# result = nb.stop.near(37.786154,-122.4053).map do |v|
# lat = 37.0+rand(751864..780090)/1000000.0
# lon = -(122.0+rand(388505..508324)/1000000.0)


  def message(agency, route)
    @nb.message.get agency, '7'
  end

  def routes(lat, long, agency)
    routes = {}
    result = nb.stop.near(lat,lon).map do |v|
      {
        tag: v[:tag],
        title: v[:title],
        route: v[:route].map do |r|
          routes[nb.route[r][:tag]] ||= nb.route[agency][:by_tag][nb.route[r][:tag]]; r
        end
      }
    end
    routes.values.to_json
  end

  def stops(lat, long, agency)
    result = nb.stop.near(lat,lon).map do |v|
      {
        tag: v[:tag],
        title: v[:title],
        route: v[:route]
      }
    end
    result.to_json
  end
end

# this returns an app that responds to call cascading down the list of
# middlewares. Technically there is no difference between "use" and
# "run". "run" is just there to illustrate that it's the end of the
# chain and it does the work.
app = Rack::Builder.new do
  use Rack::Etag            # Add an ETag
  use Rack::ConditionalGet  # Support Caching
  use Rack::Deflator        # GZip
  run NextBusApp            # Next Bus App
end

Rack::Server.start :app => app
