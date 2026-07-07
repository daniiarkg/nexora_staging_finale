FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN go test ./...
RUN go build -o /out/api ./cmd/api
RUN go build -o /out/import-legacy ./cmd/import-legacy

FROM alpine:3.20
WORKDIR /app
RUN adduser -D -H nexora && mkdir -p /data/uploads && chown -R nexora:nexora /data
COPY --chown=nexora:nexora --from=build /out/api /app/api
COPY --chown=nexora:nexora --from=build /out/import-legacy /app/import-legacy
COPY --chown=nexora:nexora migrations /app/migrations
USER nexora
EXPOSE 8080
CMD ["/app/api"]
