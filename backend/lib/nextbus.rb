require 'ap'
require 'geohash'
require 'json'
require 'hashie'
require 'nori'
require 'active_support'

module ServiceMixin
  
  class << self
    def included(base)
      base.extend(ClassMethods)
    end
  end
  
  def fetch(*args)
    parent.nori.parse(
      File.read(File.join(
        File.dirname(__FILE__),
        '..',
        uri(*args).sub(/^.*\//,'')
      ))
    )
  end
  
  def process(response, tag, key, *merge, &block)
    response.extend Hashie::Extensions::DeepFind unless response.respond_to?(:deep_find)
    response.class.send(:include, Hashie::Extensions::DeepMerge) unless response.respond_to?(:deep_merge!)
    result = response.deep_find(tag)
    Hash[*result.map do |v|
      block.call(v) if block_given?
      [v[key], merge.empty? ? v : v.merge(*merge)]
    end.flatten]
  end
  
  module ClassMethods
    def parent(klass = nil)
      @parent = klass unless klass.nil?
      @parent
    end
  end
  
  def name
    self.class.to_s.sub(/^.*::/,'').downcase
  end

  def parent
    # The Service I belong to
    self.class.parent
  end

  def uri(*args)
    # A URI is the Service URI, plus its command
    # Plus any args specified
    parent.uri+"?"+[
      args.empty? ? nil : args.last.map {|k,v| "#{k}=#{CGI.escape v.to_s}"}
    ].flatten.compact.join('&')
  end

  

  attr_accessor :ttl
end

class Service
  
  def uri
    self.class.uri
  end
  
  def nori
    self.class.nori
  end

  class << self
    def uri(uri = nil)
      if uri.nil?
        @uri
      else
        @uri = uri
      end
    end
    
    def nori(nori=nil)
      if nori.nil?
        @nori
      else
        @nori = nori
      end
    end
    
    def model(model, &block)
      line = __LINE__; class_eval %{
        const_set(model.capitalize,Class.new(Hash))
        # Mixin Service Handlers to our new Hash subclass
        #{model.capitalize}.send(:include, ServiceMixin)
        # Establish Parent Relationship
        #{model.capitalize}.send(:parent, self)
        # Evaluate our given block in Class Context
        #{model.capitalize}.class_eval(&block) if block_given?
        
        def #{model}
          @#{model} = @#{model} || #{model.capitalize}.new # !> instance variable @route not initialized
        end
        
      }, __FILE__, line
      
    end
  end
end

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
        self[:by_tag] = process(
          fetch(command: :routeList, a: agency),
          :route, :tag,
          agency: agency
        )
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
  locationhash = GeoHash.encode(37.754,-122.487,7)
  ap nb.stop[:geo].select {|k,v| locationhash == k[0..locationhash.length-1]}
end
# ~> -:16:in `read': No such file or directory - ./../publicXMLFeed?command=routeList&a=sf-muni (Errno::ENOENT)
# ~> 	from -:16:in `fetch'
# ~> 	from -:121:in `list'
# ~> 	from -:139:in `<module:Nextbus>'
# ~> 	from -:106:in `<main>'
