FROM php:8.1-apache

ENV ACCEPT_EULA=Y

RUN apt-get update && apt-get install -y nano wget gnupg2

# Configura las variables de entorno para configuración adicional
ENV SOURCE=pre-proyecto  
ENV ENDPOINT=mysql-proyecto 
ENV DATABASE=proyecto
ENV USERD=user
ENV PASSD=psswrd-proyecto-user!
ENV SIMPLE=simple-proyecto

# Copiar archivos al contenedor
RUN mkdir -p /var/www/proyecto/public_content
RUN mkdir -p /var/www/private_content
COPY . /var/www/proyecto
RUN mv /var/www/proyecto/simplesaml /var/www/simplesaml
RUN mkdir -p /var/www/proyecto/public_content
# Enable session
RUN echo "session.save_path=\"/tmp\"" >> /usr/local/etc/php/php.ini

# Install SqlServer PHP driver
# RUN cat /etc/os-release \
#   && apt-get update \
#   && curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
#   && curl https://packages.microsoft.com/config/ubuntu/22.04/prod.list \
#       > /etc/apt/sources.list.d/mssql-release.list \
#   && apt-get install -y --no-install-recommends apt-transport-https \
#   && apt-get update \
#   && ACCEPT_EULA=Y apt-get -y --no-install-recommends install unixodbc-dev msodbcsql17

# Install PHP extensions
RUN docker-php-ext-install calendar
RUN docker-php-ext-install pdo_mysql 
  # && pecl install sqlsrv pdo_sqlsrv \
  # && docker-php-ext-enable sqlsrv pdo_sqlsrv
RUN docker-php-ext-install mysqli


# Habilita mod_rewrite en Apache
COPY 000-default.conf  /etc/apache2/sites-available/000-default.conf
RUN a2enmod rewrite && \
    echo "display_errors = Off" >> /usr/local/etc/php/php.ini && \
    echo "log_errors = On" >> /usr/local/etc/php/php.ini
RUN service apache2 restart

EXPOSE 80
