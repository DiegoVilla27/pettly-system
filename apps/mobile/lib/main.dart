import 'package:flutter/material.dart';

void main() {
  runApp(const PettlyApp());
}

class PettlyApp extends StatelessWidget {
  const PettlyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Pettly',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF18332A)),
      ),
      home: Scaffold(
        appBar: AppBar(title: const Text('Pettly')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'Productos, servicios y adopciones para tus animales.',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ),
    );
  }
}
