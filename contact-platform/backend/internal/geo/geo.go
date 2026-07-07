package geo

import (
	"regexp"
	"strconv"
	"strings"
)

var coordinatePairs = regexp.MustCompile(`(-?\d{1,3}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)`)

func NormalizeURI(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if strings.HasPrefix(strings.ToLower(value), "geo:") {
		return value
	}
	pairs := coordinatePairs.FindAllStringSubmatch(value, -1)
	if len(pairs) == 0 {
		return ""
	}
	is2GIS := strings.Contains(strings.ToLower(value), "2gis")
	for index := len(pairs) - 1; index >= 0; index-- {
		first, errFirst := strconv.ParseFloat(pairs[index][1], 64)
		second, errSecond := strconv.ParseFloat(pairs[index][2], 64)
		if errFirst != nil || errSecond != nil {
			continue
		}
		if is2GIS && abs(first) <= 180 && abs(second) <= 90 {
			return "geo:" + formatCoord(second) + "," + formatCoord(first)
		}
		if abs(first) <= 90 && abs(second) <= 180 {
			return "geo:" + formatCoord(first) + "," + formatCoord(second)
		}
	}
	return ""
}

func Coordinates(value string) (string, string, bool) {
	value = strings.TrimSpace(value)
	if !strings.HasPrefix(strings.ToLower(value), "geo:") {
		return "", "", false
	}
	value = value[4:]
	if queryIndex := strings.Index(value, "?"); queryIndex >= 0 {
		value = value[:queryIndex]
	}
	parts := strings.Split(value, ",")
	if len(parts) < 2 {
		return "", "", false
	}
	lat := strings.TrimSpace(parts[0])
	lon := strings.TrimSpace(parts[1])
	if lat == "" || lon == "" {
		return "", "", false
	}
	return lat, lon, true
}

func abs(value float64) float64 {
	if value < 0 {
		return -value
	}
	return value
}

func formatCoord(value float64) string {
	return strconv.FormatFloat(value, 'f', -1, 64)
}
