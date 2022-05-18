
FROM nginx:1.21.6

SHELL ["/bin/bash", "-c"]

WORKDIR /

ADD _internal/webpack_transpilation_fixes.patch /webpack_transpilation_fixes.patch
ADD .tool-versions /

RUN set -eux \
    export DEBIAN_FRONTEND=noninteractive;  \
    apt-get update -qq; \
    apt-get install --no-install-recommends --no-install-suggests --yes make git gcc curl libpcre2-dev libssl-dev zlib1g-dev; \
    mkdir -p /tmp/nginx; \
    curl --retry 6 --location "https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz" \
        | gunzip | tar --extract --strip-components=1 --directory /tmp/nginx; \
    cd /tmp; \
    git clone https://github.com/nginx/njs.git; \
    cd /tmp/njs; \
    git apply /webpack_transpilation_fixes.patch; \
    ./configure; \
    make; \
    NJS_PATH="$(which njs)"; \
    rm "${NJS_PATH}"; \
    cp build/njs "${NJS_PATH%/*}/"; \
    cd /tmp/nginx; \
    # Solution to perfectly capture original config of nginx taken from https://askubuntu.com/a/1195939
    CONFIG=`2>&1 nginx -V | grep 'configure arguments:' | sed 's/configure arguments: //'`; \
    echo "./configure --add-dynamic-module=/tmp/njs/nginx $CONFIG" > tempconfigure.sh; \
    chmod 755 tempconfigure.sh; \
    ./tempconfigure.sh; \
    rm tempconfigure.sh; \
    make; \
    rm /usr/lib/nginx/modules/ngx_http_js_module*; \
    cp objs/ngx_http_js_module.so /usr/lib/nginx/modules; \
    cp objs/ngx_stream_js_module.so /usr/lib/nginx/modules


RUN git clone https://github.com/asdf-vm/asdf.git $HOME/.asdf --branch v0.10.0; \
    echo -e '\nsource $HOME/.asdf/asdf.sh' >> ~/.bashrc; \
    source ~/.bashrc; \
    asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git; \
    cat .tool-versions > $HOME/.tool-versions; \
    asdf install; \
    npm install -g npm@latest; \
    apt-get purge --yes --auto-remove make git gcc curl libpcre2-dev libssl-dev zlib1g-dev; \
    rm -rf \
      /var/lib/apt/lists/* \
      /tmp/*;

RUN mkdir -p /create-njs-app

ENV CNA_NGINX=nginx

WORKDIR /create-njs-app

# HACK: this will stop docker logs from being available, but solves some permissions issues.
RUN rm /var/log/nginx/*; \
    touch /var/log/nginx/error.log; \
    touch /var/log/nginx/access.log;


# Keep tail as pid 1 so that reloading nginx does not kill the container
CMD tail -f /dev/null
