FROM maugnorbert/docker_golem_nvidia:535_43_02

RUN apt-get update && apt-get upgrade -y && apt-get install -y \
	openssh-server \
	inetutils-syslogd \
	libsndfile1 \
	curl \
	git \
	nano \
	ca-certificates \
	gnupg \
	ffmpeg \
	make \
	build-essential \
	libssl-dev \
	zlib1g-dev \
	libbz2-dev \
	libreadline-dev \
	libsqlite3-dev \
	wget \
	llvm \
	libncurses5-dev \
	libncursesw5-dev \
	xz-utils \
	tk-dev \
	liblzma-dev \
	lzma \
	libsox-dev \
	&& rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/apt/keyrings
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_21.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list

RUN apt-get update && apt-get install -y \
	nodejs \
	&& rm -rf /var/lib/apt/lists/*

RUN curl https://pyenv.run | bash

ENV PYENV_ROOT="/root/.pyenv"
ENV PATH="$PYENV_ROOT/bin:$PATH"
RUN pyenv install 3.8 && pyenv virtualenv 3.8 sst

RUN mkdir -p /run/sshd
RUN echo "PermitRootLogin yes" >> /etc/ssh/sshd_config \
    && echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config

RUN git clone https://huggingface.co/spaces/facebook/seamless-streaming /root/seamless-streaming
RUN cd /root/seamless-streaming/seamless_server \
	&& eval "$(pyenv init -)" && pyenv activate sst \
	&& pip install numpy \
	&& pip install typing-extensions \
	&& pip install -r requirements.txt

COPY libs/huggingface /root/huggingface/
COPY libs/seamless_communication-1.0.0-py3-none-any.whl /root/seamless-streaming/seamless_server/whl/
COPY libs/nltk_data /root/nltk_data/

COPY models/m2m_expressive_unity.pt /root/seamless-streaming/seamless_server/models/Seamless/
COPY models/pretssel_melhifigan_wm.pt /root/seamless-streaming/seamless_server/models/Seamless/
COPY models/pretssel_melhifigan_wm-16khz.pt /root/seamless-streaming/seamless_server/models/Seamless/

COPY patchs_seamless-streaming_streaming-react-app/createBufferedSpeechPlayer.ts /root/seamless-streaming/streaming-react-app/src/
COPY patchs_seamless-streaming_streaming-react-app/StreamingInterface.tsx /root/seamless-streaming/streaming-react-app/src/
COPY patchs_seamless-streaming_streaming-react-app/URLParams.ts /root/seamless-streaming/streaming-react-app/src/
COPY patchs_seamless-streaming_streaming-react-app/URLParamsTypes.ts /root/seamless-streaming/streaming-react-app/src/types/

RUN cd /root/seamless-streaming/streaming-react-app \
	&& npm install --global yarn \
	&& yarn \
	&& yarn build

COPY start.sh /root/

WORKDIR /root/seamless-streaming/seamless_server

CMD ["/root/start.sh"]