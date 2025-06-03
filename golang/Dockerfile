From golang:1.23-alpine as builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o todo-api ./main.go

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/todo-api .
EXPOSE 3000
CMD ["./todo-api"]

