FROM ruby:2.0
RUN mkdir nextbus
WORKDIR nextbus/
COPY Gemfile Gemfile
COPY Gemfile.lock Gemfile.lock
COPY nextbus.gemspec nextbus.gemspec
RUN mkdir -p lib/nextbus
COPY lib/nextbus/version.rb lib/nextbus/version.rb
RUN bundle install
RUN mkdir cache
RUN mkdir config
COPY cache/.gitignore cache/.gitignore
COPY config/config.ru config/config.ru
ENV RACK_ENV production
COPY lib/nextbus.rb lib/nextbus.rb
COPY lib/nextbus/nextbus.rb lib/nextbus/nextbus.rb
COPY lib/nextbus/service.rb lib/nextbus/service.rb
EXPOSE 9292
