package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type config struct {
	dbUser     string
	dbPassword string
	dbHost     string
	dbPort     string
	dbName     string
}

func GetDBConfig() config {
	return config{
		dbUser:     lay_env("DB_USER", "root"),
		dbPassword: lay_env("DB_PASSWORD", "password"),
		dbHost:     lay_env("DB_HOST", "127.0.0.1"),
		dbPort:     lay_env("DB_PORT", "3307"),
		dbName:     lay_env("DB_NAME", "todo_list"),
	}
}

func lay_env(key, defaultkey string) string {
	r := os.Getenv(key)
	if r == "" {
		r = defaultkey
		return r
	}
	return r
}

type todolist struct {
	Id          int    `json:"id" gorm:"column:id"`
	Description string `json:"description" gorm:"column:description"`
	Completed   bool   `json:"completed" gorm:"column:completed"`
}
type Updatetodolist struct {
	Description *string `json:"description" gorm:"column:description"`
	Completed   *bool   `json:"completed" gorm:"column:completed"`
}

func (todolist) TableName() string       { return "todo" }
func (Updatetodolist) TableName() string { return todolist{}.TableName() }

func main() {

	env := GetDBConfig()
	dsn := fmt.Sprintf("%v:%v@tcp(%v:%v)/%v?charset=utf8mb4&parseTime=True&loc=Local", env.dbUser, env.dbPassword, env.dbHost, env.dbPort, env.dbName)
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalln(err)
	}
	if err := db.AutoMigrate(&todolist{}); err != nil {
		log.Fatalln("Lỗi khi tạo bảng:", err)
	}

	fmt.Print(db)
	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:8080", "http://127.0.0.1:8080", "*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	v1 := r.Group("/v1")
	{
		v1.GET("/items", GetAllTodos(db))
		v1.POST("/items", Createtodo(db))
		v1.GET("/items/:id", Gettodo(db))
		v1.PATCH("/items/:id", Updatetodo(db))
		v1.DELETE("/items/:id", Deletetodo(db))
	}
	// Thêm vào trước r.Run(":3000")
	r.GET("/cors-debug", func(c *gin.Context) {
		headers := map[string]string{}
		for k, v := range c.Request.Header {
			if len(v) > 0 {
				headers[k] = v[0]
			}
		}
		
		c.JSON(http.StatusOK, gin.H{
			"headers": headers,
			"method": c.Request.Method,
			"origin": c.Request.Header.Get("Origin"),
			"remote_addr": c.Request.RemoteAddr,
		})
	})
	r.Run(":3000")
}

func Createtodo(db *gorm.DB) func(*gin.Context) {
	return func(c *gin.Context) {
		var data todolist

		if err := c.ShouldBind(&data); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"err": err.Error(),
			})
			return
		}

		if err := db.Create(&data).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"err": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"data": data.Id,
		})
	}
}

func Gettodo(db *gorm.DB) func(*gin.Context) {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"err": err.Error(),
			})
			return
		}
		var data todolist
		if err := db.First(&data, id).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"err": err.Error(),
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"data": data,
		})
	}
}
func Updatetodo(db *gorm.DB) func(*gin.Context) {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"err": err.Error(),
			})
			return
		}
		var data Updatetodolist
		if err := c.ShouldBind(&data); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"err": err.Error(),
			})
			return
		}

		if err := db.Model(&todolist{}).Where("id = ?", id).Updates(&data).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"err": err.Error(),
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"data": true,
		})
	}
}

func Deletetodo(db *gorm.DB) func(*gin.Context) {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"err": err.Error(),
			})
			return
		}
		var data todolist
		if err := db.Model(&todolist{}).Where("id = ?", id).Delete(&data).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"err": err.Error(),
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"data": true,
		})
	}
}

func GetAllTodos(db *gorm.DB) func(*gin.Context) {
	return func(c *gin.Context) {
		var data []todolist
		if err := db.Find(&data).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"err": err.Error(),
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"data": data,
		})
	}
}
