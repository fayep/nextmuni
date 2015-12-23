require 'rack'
require 'rack/deflater'
require 'sinatra/base'
require 'json'
require 'nextbus/nextbus'
require 'benchmark'
require 'msgpack'


class NextBusApp < Sinatra::Base
  configure do
    enable :logging
    set :server, %w[thin webrick]
  end
  use Rack::CommonLogger, STDOUT
  use Rack::ConditionalGet  # Support Caching
  use Rack::Deflater        # GZip

  def initialize
    super
    @nb = Nextbus::Nextbus.new
    @nb.agency.get
    agency = 'sf-muni'
    @nb.route.get agency # =>
    @nb.route[agency][:by_tag].values.each { |r| @nb.stop.get r }
    @nb.route.index_directions(agency)
    regions = @nb.agency[:by_region].keys.sort

    #  location = GeoHash.new(37.753895,-122.4888, precision=7)
    #  location = GeoHash.new(37.784602,-122.407329, precision=7)
    # result = nb.stop.near(37.786154,-122.4053).map do |v|
    # lat = 37.0+rand(751864..780090)/1000000.0
    # lon = -(122.0+rand(388505..508324)/1000000.0)

  end

  get '/mp/message/:agency/:route' do
    headers['Content-Type'] = 'application/msgpack'
    @nb.message.get(params[:agency], params[:route]).to_msgpack
  end

  get '/mp/nearest/:agency/:lat/:lon' do
    routes = {}
    headers['Content-Type'] = 'application/msgpack'
    lat = params[:lat].to_f
    lon = params[:lon].to_f
    agency = params[:agency]
    result = @nb.stop.near(lat,lon).map do |v|
      {
        tag: v[:tag],
        title: v[:title],
        route: v[:route].map do |r|
          routes[@nb.route[r][:tag]] ||= @nb.route[agency][:by_tag][@nb.route[r][:tag]]; r
        end
      }
    end
    { routes: routes.values, stops: result }.to_msgpack
  end

  get '/message/:agency/:route' do
    headers['Content-Type'] = 'application/json'
    @nb.message.get(params[:agency], params[:route]).to_json
  end

  get '/nearest/:agency/:lat/:lon' do
    routes = {}
    headers['Content-Type'] = 'application/json'
    lat = params[:lat].to_f
    lon = params[:lon].to_f
    agency = params[:agency]
    result = @nb.stop.near(lat,lon).map do |v|
      {
        tag: v[:tag],
        title: v[:title],
        route: v[:route].map do |r|
          routes[@nb.route[r][:tag]] ||= @nb.route[agency][:by_tag][@nb.route[r][:tag]]; r
        end
      }
    end
    { routes: routes.values, stops: result }.to_json
  end
end
