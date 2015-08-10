require 'hashie'
require 'nori'
require 'cgi'

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
        '..','..',
        uri(*args).sub(/^.*\//,'')
      ))
    )
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
