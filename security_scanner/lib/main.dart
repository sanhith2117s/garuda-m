import 'package:flutter/material.dart';
import 'app_state.dart';
import 'home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppState.load();
  runApp(const GarudaScannerApp());
}

class GarudaScannerApp extends StatelessWidget {
  const GarudaScannerApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GARUDA',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      home: const HomeScreen(),
    );
  }
}
