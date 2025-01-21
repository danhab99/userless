package main

import (
	"fmt"
	"reflect"
	"unicode"
)

func toCamelCase(s string) string {
	if s == "" {
		return s
	}

	runes := []rune(s)

	// Convert first character to lowercase
	runes[0] = unicode.ToLower(runes[0])

	return string(runes)
}

func StructToMap(obj interface{}) map[string]interface{} {
	result := make(map[string]interface{})

	value := reflect.ValueOf(obj)
	if value.Kind() == reflect.Ptr {
		value = value.Elem()
	}

	if value.Kind() != reflect.Struct {
		return result
	}

	typ := value.Type()

	for i := 0; i < value.NumField(); i++ {
		field := typ.Field(i)
		fieldValue := value.Field(i)

		if !field.IsExported() {
			continue
		}

		camelCaseKey := toCamelCase(field.Name)

		// Handle different types
		switch fieldValue.Kind() {
		case reflect.Struct:
			result[camelCaseKey] = StructToMap(fieldValue.Interface())

		case reflect.Slice, reflect.Array:
			length := fieldValue.Len()
			sliceResult := make([]interface{}, length)
			for j := 0; j < length; j++ {
				item := fieldValue.Index(j)
				if item.Kind() == reflect.Struct {
					sliceResult[j] = StructToMap(item.Interface())
				} else {
					sliceResult[j] = item.Interface()
				}
			}
			result[camelCaseKey] = sliceResult

		case reflect.Map:
			mapResult := make(map[string]interface{})
			iter := fieldValue.MapRange()
			for iter.Next() {
				k := iter.Key()
				v := iter.Value()
				if v.Kind() == reflect.Struct {
					mapResult[fmt.Sprint(k.Interface())] = StructToMap(v.Interface())
				} else {
					mapResult[fmt.Sprint(k.Interface())] = v.Interface()
				}
			}
			result[camelCaseKey] = mapResult

		case reflect.Ptr:
			if !fieldValue.IsNil() {
				if fieldValue.Elem().Kind() == reflect.Struct {
					result[camelCaseKey] = StructToMap(fieldValue.Elem().Interface())
				} else {
					result[camelCaseKey] = fieldValue.Elem().Interface()
				}
			} else {
				result[camelCaseKey] = nil
			}

		default:
			result[camelCaseKey] = fieldValue.Interface()
		}
	}

	return result
}
