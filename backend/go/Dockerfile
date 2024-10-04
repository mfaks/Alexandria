FROM golang:1.23 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
ARG TARGETOS
ARG TARGETARCH
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o main ./cmd/server
FROM gcr.io/distroless/static-debian11
WORKDIR /app
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["/app/main"]