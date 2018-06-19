"use strict";

const Tracer = require("datadog-tracer"),
  fetch = require("node-fetch"),
  APP_NAME = "testappjs";

function register_app(app_name) {
  fetch(`http://localhost:8126/v0.3/services`, {
    method: "PUT",
    body: `{"${app_name}":{"app":"express","app_type":"web"}}`,
    headers: { 'Content-Type': 'application/json' }
  })
    .then(res => {
      console.log(`registered application with DataDog APM: ${res.status} ${res.statusText}`);
    })
    .catch(err => {
      console.log(`unable to register application with DataDog APM: ${err}`);
    });
}

function create_tracer(app_name) {
  const tracer = new Tracer({
    service: app_name,
    hostname: "localhost",
    port: 8126
  });
  tracer.on("error", e => {
    console.log(`problem with metric reporting: ${e}`);
  });

  return tracer;
}

function create_root_span(tracer) {
      const span = tracer.startSpan('request');
      span.addTags({
            'env'              : "local_dev",
            'resource'         : "/some/{var}",
            'type'             : 'web',
            'span.kind'        : 'server',
            'http.method'      : "GET",
            'http.url'         : '/some/path',
            'http.status_code' : 200,
            'runtime'          : 'nodejs',
            'applicationName'  : APP_NAME,
            'version'          : '1.2.3'
      });
      return span;
}

function create_sub_span(span, resource_name) {
      const subSpan = span._parentTracer.startSpan(resource_name, {
            childOf: span.context(),
      });
      subSpan.addTags({
            'resource': resource_name,
            'type': 'web',
            'runtime': 'nodejs',
            'env': 'local_dev'
      });
      return subSpan;
}

console.log("registering application");
register_app(APP_NAME);
console.log("starting tracer");
const t = create_tracer(APP_NAME);

for (let i = 0 ; i < 10 ; i++) {
    console.log(`completing span: ${i}`);
    const root_span = create_root_span(t);
    const sub_span = create_sub_span(root_span, 'tracksomethingjs');
    sub_span.finish();
    root_span.finish();
}
