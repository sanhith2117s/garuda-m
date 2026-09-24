import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

// ── API Server Configuration ──────────────────────────────────────────────────
class AppState {
  static String baseUrl = 'http://192.168.0.102:8080';
  static List<Map<String, dynamic>> passTypes = [];
  static bool isOnline = false;

  static Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    baseUrl = prefs.getString('base_url') ?? 'http://192.168.0.102:8080';
    // Run connectivity check in the background to prevent blocking startup
    fetchPassTypes();
  }

  static Future<void> setBaseUrl(String url) async {
    baseUrl = url;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('base_url', url);
    await fetchPassTypes();
  }

  static Future<void> fetchPassTypes() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/api/gate/pass-types'))
          .timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final list = jsonDecode(res.body) as List;
        passTypes = list.map((e) => Map<String, dynamic>.from(e)).toList();
        isOnline = true;
      } else {
        isOnline = false;
      }
    } catch (_) {
      isOnline = false;
    }
  }
}

// ── Garuda Light Theme Tokens ─────────────────────────────────────────────────
class AppTheme {
  // Light, airy backgrounds
  static const bg = Color(0xFFF8FAFC); // Very light slate
  static const surface = Color(0xFFFFFFFF);
  
  // Garuda Brand Accents (Saffron/Orange & Blue/Indigo)
  static const blue = Color(0xFF2563EB); // Deep Blue
  static const emerald = Color(0xFF059669); // Green
  static const rose = Color(0xFFE11D48); // Red
  static const purple = Color(0xFF7C3AED); // Purple
  static const saffron = Color(0xFFF97316); // Orange
  static const amber = Color(0xFFF59E0B);
  static const surfaceLight = Color(0xFFF1F5F9);

  static const textPrimary = Color(0xFF0F172A);
  static const textSecondary = Color(0xFF64748B);

  static Color modeColor(String mode) {
    switch (mode) {
      case 'instant': return blue;
      case 'lunch': return saffron;
      case 'late': return rose;
      case 'custom_pass': return purple;
      default: return blue;
    }
  }

  static ThemeData get theme => ThemeData(
    brightness: Brightness.light,
    scaffoldBackgroundColor: bg,
    primaryColor: blue,
    fontFamily: 'Inter',
  );
}
