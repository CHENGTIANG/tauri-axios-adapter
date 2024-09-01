<template>
  <button @click="onGetRequest">Get Text</button>
  <button @click="onGetJsonRequest">Get Json</button>
  <button @click="onPostJsonRequest">Post Json</button>
  <button @click="onPostFormRequest">Post Form</button>
  <button @click="onBlobRequest">Get Blob</button>
  <button @click="onArraybufferRequest">Get Arraybuffer</button>
  <button @click="onUploadRequest">Upload</button>
  <button @click="onRedirectRequest">Redirect</button>
  <button @click="onTimeoutRequest">Timeout</button>
  <button @click="onErrorRequest">Error</button>
  <button @click="onNotFoundRequest">Not Found</button>
</template>
<script lang="ts" setup>
import axios, { AxiosRequestConfig } from "axios";
import tauriAxiosAdapter from "../../src/index.ts";
const api = axios.create({
  adapter: tauriAxiosAdapter,
});
const api2 = axios.create();
const onGetRequest = () => {
  const config: AxiosRequestConfig = {
    url: "http://localhost:8000/get/text",
  };
  request(config);
};

const onGetJsonRequest = () => {
  const config: AxiosRequestConfig = {
    url: "http://localhost:8000/get/json",
    params: {
      key1: "value1",
      key2: "value2",
    },
  };
  request(config);
};

const onPostJsonRequest = () => {
  const config: AxiosRequestConfig = {
    url: "http://localhost:8000/post/json",
    data: {
      name: "Grant",
    },
    method: "post",
  };
  request(config);
};

const onPostFormRequest = () => {
  const config: AxiosRequestConfig = {
    url: "http://localhost:8000/post/form",
    data: "name=Grant",
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };
  request(config);
};

const onBlobRequest = () => {
  const config: AxiosRequestConfig = {
    url: "http://localhost:8000/download",
    responseType: "blob",
  };
  request(config);
};

const onArraybufferRequest = () => {
  const config: AxiosRequestConfig = {
    url: "http://localhost:8000/download",
    responseType: "arraybuffer",
  };
  request(config);
};

const onRedirectRequest = () => {
  const config: AxiosRequestConfig = {
    url: "http://localhost:8000/redirect",
  };
  request(config);
};

const onUploadRequest = () => {
  const formData = new FormData();
  formData.append("name", "abc");
  formData.append("file", new File([JSON.stringify("hello")], "hell.txt"));
  const config: AxiosRequestConfig = {
    url: "http://localhost:8000/upload",
    method: "post",
    data: formData,
  };
  request(config);
};

const onTimeoutRequest = async () => {
  const config: AxiosRequestConfig = {
    url: "http://localhost:8000/delayed",
    timeout: 1000,
  };
  request(config);
};

const onErrorRequest = () => {
  const config: AxiosRequestConfig = {
    url: "http://localhost:8000/error",
  };
  request(config);
};

const onNotFoundRequest = () => {
  const config: AxiosRequestConfig = {
    url: "http://localhost:8000/404",
  };
  request(config);
};

const request = async (config: AxiosRequestConfig) => {
  const [res1, res2] = await Promise.allSettled([
    api.request(config),
    api2.request(config),
  ]);
  if (res1.status !== res2.status) {
    console.log(res1);
    console.log(res2);
  } else if (res1.status === "fulfilled" && res2.status === "fulfilled") {
    console.log(res1.value);
    console.log(res2.value);
  } else if (res1.status === "rejected" && res2.status === "rejected") {
    console.log(res1.reason);
    console.log(res2.reason);
  }
};
</script>
