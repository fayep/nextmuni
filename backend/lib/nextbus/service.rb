require 'hashie'
require 'nori'
require 'cgi'
require 'net/http'

module ServiceMixin

  class << self
    def included(base)
      base.extend(ClassMethods)
    end
  end

  def fetch(*args)
    parent.fetch uri(*args)
  end

  def process(response, tag, key, *merge, &block)
    response.extend Hashie::Extensions::DeepFind unless response.respond_to?(:deep_find)
    response.class.send(:include, Hashie::Extensions::DeepMerge) unless response.respond_to?(:deep_merge!)
    result = response.deep_find(tag)
    result = [result] if result.is_a? Hash
    Hash[*result.map do |v|
      block.call(v) if block_given?
      [v[key], merge.empty? ? v : v.merge(*merge)]
    end.flatten]
  end

  module ClassMethods
    def parent(klass = nil)
      @parent = klass if klass
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

  def cache_directory
    self.class.cache_directory
  end

  class << self

    def cache_directory(dir = nil)
      if dir
        @cache_directory = dir
      else
        @cache_directory ||= File.join(File.dirname(__FILE__),'..','..','cache')
      end
    end

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

    def fetch(url)
      cachefile = File.join(cache_directory,url.sub(/^.*\//,''))
      uri = URI(url)
      req = Net::HTTP::Get.new(uri)
      if File.exist? cachefile
        stat = File.stat(cachefile)
        req['If-Modified-Since'] = stat.mtime.rfc2822
      end
      res = Net::HTTP.start(uri.hostname, uri.port) {|http|
        http.request(req)
      }
      if res.is_a? Net::HTTPSuccess
        open cachefile, 'w' do |io|
          io.write res.body
        end
        nori.parse(res.body)
      else
        nori.parse(File.read(cachefile))
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
          @#{model} ||= #{model.capitalize}.new
        end

      }, __FILE__, line

    end
  end
end
