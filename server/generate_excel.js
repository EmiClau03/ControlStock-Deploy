const fs = require('fs');
const xlsx = require('xlsx');

const rawData = [
  // AUDI
  { Marca: 'AUDI', Modelo: 'A3 Sportback 2.0 TFSI 5P', Año: 2011, Color: 'Blanco', Patente: 'KQG 212', KM: 110000, Precio: 25000000, Combustible: 'Nafta', Estado: 'Disponible' },
  // CITROEN
  { Marca: 'CITROEN', Modelo: 'C4 1.6 16V 5P', Año: 2009, Color: 'Azul', Patente: 'IAD 806', KM: 240000, Precio: 9500000, Combustible: 'Nafta', Estado: 'Disponible' },
  // CHEVROLET
  { Marca: 'CHEVROLET', Modelo: 'Agile LS 1.4 5P', Año: 2015, Color: 'Blanco', Patente: 'OJV 299', KM: 150000, Precio: 15000000, Combustible: 'Nafta', Estado: 'Disponible' },
  { Marca: 'CHEVROLET', Modelo: 'Astra 2.0 4P', Año: 2006, Color: 'Azul', Patente: 'FGC 021', KM: 210000, Precio: 8000000, Combustible: 'Nafta', Estado: 'Disponible' },
  { Marca: 'CHEVROLET', Modelo: 'Astra 2.0', Año: 2005, Color: 'Gris', Patente: 'EHV 517', KM: 110000, Precio: 7000000, Combustible: 'Nafta', Estado: 'Disponible' },
  { Marca: 'CHEVROLET', Modelo: 'Aveo 1.6 4P', Año: 2010, Color: 'Azul', Patente: 'IUA 604', KM: '', Precio: 10000000, Combustible: 'Nafta', Estado: 'Disponible' },
  { Marca: 'CHEVROLET', Modelo: 'Corsa 1.6 3P', Año: 2003, Color: 'Gris Oscuro', Patente: 'DNL 090', KM: 140000, Precio: 6000000, Combustible: 'Nafta', Estado: 'Vendido' },
  { Marca: 'CHEVROLET', Modelo: 'Corsa 1.6 4P', Año: 2006, Color: 'Gris', Patente: 'GYC 192', KM: '', Precio: 6000000, Combustible: 'Nafta', Estado: 'Disponible' },
  { Marca: 'CHEVROLET', Modelo: 'Corsa SW 1.6 5P', Año: 2006, Color: 'Gris', Patente: 'FMS 550', KM: 250000, Precio: 7000000, Combustible: 'Nafta', Estado: 'Disponible' },
  { Marca: 'CHEVROLET', Modelo: 'Corsa Classic 1.6 GL 4P', Año: 2009, Color: 'Gris Oscuro', Patente: 'HUB 189', KM: '', Precio: 8000000, Combustible: 'Nafta', Estado: 'Disponible' },
  { Marca: 'CHEVROLET', Modelo: 'Corsa LT 1.4 4P', Año: 2010, Color: 'Gris', Patente: 'IVT 064', KM: 260000, Precio: 8500000, Combustible: 'Nafta', Estado: 'Disponible' },
  { Marca: 'CHEVROLET', Modelo: 'Corsa Classic 1.4 4P', Año: 2010, Color: 'Gris', Patente: 'IPP 314', KM: 126000, Precio: 8800000, Combustible: 'Nafta', Estado: 'Disponible' },
  { Marca: 'CHEVROLET', Modelo: 'Corsa Classic 1.4 4P', Año: 2016, Color: 'Gris', Patente: 'POR 492', KM: 120000, Precio: 12000000, Combustible: 'Nafta', Estado: 'Disponible' },
  { Marca: 'CHEVROLET', Modelo: 'Meriva 1.8 GL Plus', Año: 2008, Color: 'Gris Oscuro', Patente: 'HBA 061', KM: 120000, Precio: 8500000, Combustible: 'Nafta', Estado: 'Disponible' },
  { Marca: 'CHEVROLET', Modelo: 'Onix Joy LS 1.4 5P', Año: 2018, Color: 'Bordo', Patente: 'AD 202 FT', KM: '', Precio: 15000000, Combustible: 'Nafta', Estado: 'Vendido' },
  { Marca: 'CHEVROLET', Modelo: 'S10 SC 2.8', Año: 2008, Color: 'Blanco', Patente: 'GTL 893', KM: '', Precio: 13000000, Combustible: 'Diesel', Estado: 'Disponible' },
  // PEUGEOT
  { Marca: 'PEUGEOT', Modelo: '206 X-Line', Año: 2006, Color: 'Gris Oscuro', Patente: 'FSS 448', KM: 210000, Precio: 7000000, Combustible: 'Nafta', Estado: 'Disponible' },
  { Marca: 'PEUGEOT', Modelo: '206 Premium 1.9', Año: 2007, Color: 'Blanco', Patente: 'GCJ 955', KM: 240000, Precio: 7000000, Combustible: 'Diesel', Estado: 'Disponible' },
  { Marca: 'PEUGEOT', Modelo: '206 SW Premium 1.6', Año: 2008, Color: 'Negro', Patente: 'HKE 521', KM: 141000, Precio: 10000000, Combustible: 'Nafta', Estado: 'Disponible' },
  { Marca: 'PEUGEOT', Modelo: '206 1.4', Año: 2011, Color: 'Gris', Patente: '', KM: 150000, Precio: 8500000, Combustible: 'Nafta', Estado: 'Disponible' },
  { Marca: 'PEUGEOT', Modelo: '207 Compact XR 1.4', Año: 2011, Color: 'Negro', Patente: 'KMA 746', KM: 156000, Precio: 11000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'PEUGEOT', Modelo: '207 Compact XS Allure 1.4', Año: 2013, Color: 'Blanco', Patente: 'MTW 621', KM: 240000, Precio: 9000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'PEUGEOT', Modelo: '207 1.4', Año: 2012, Color: 'Verde Agua', Patente: 'KZX 822', KM: 243000, Precio: 9000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'PEUGEOT', Modelo: '208 Allure 1.6', Año: 2016, Color: 'Blanco', Patente: 'AA 666 OJ', KM: 60000, Precio: 19000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'PEUGEOT', Modelo: '308 Sport 1.6 THP', Año: 2013, Color: 'Negro', Patente: 'MXY 516', KM: 130000, Precio: 16000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'PEUGEOT', Modelo: '308 Sport 1.6 THP', Año: 2013, Color: 'Blanco', Patente: 'NUH 560', KM: 150000, Precio: 15500000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'PEUGEOT', Modelo: '408 Sport 1.6 THP', Año: 2013, Color: 'Blanco', Patente: 'MKQ 589', KM: 150000, Precio: 16000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'PEUGEOT', Modelo: '504 Cerrada', Año: 1986, Color: 'Naranja', Patente: 'TOI 832', KM: '', Precio: 8000000, Combustible: 'Diesel', Estado: 'Disponible' },
  { Marca: 'PEUGEOT', Modelo: 'Partner 1.6 HDI', Año: 2010, Color: 'Gris', Patente: 'JDM 340', KM: 210000, Precio: '', Combustible: 'Diesel', Estado: 'Disponible' },
  { Marca: 'PEUGEOT', Modelo: 'Partner 1.6', Año: 2014, Color: 'Blanca', Patente: 'MTR 973', KM: 168000, Precio: 15000000, Combustible: 'Diesel', Estado: 'Disponible' },
  // TOYOTA
  { Marca: 'TOYOTA', Modelo: 'Corolla XEI 1.6', Año: 2003, Color: 'Gris Plata', Patente: 'EDR 468', KM: 135000, Precio: 9500000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'TOYOTA', Modelo: 'Etios XLS 1.5', Año: 2013, Color: 'Gris Plata', Patente: 'NGZ 126', KM: 140000, Precio: 17000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'TOYOTA', Modelo: 'Hilux SR 2.4 4x2', Año: 2017, Color: 'Gris Oscuro', Patente: 'AA 873 JA', KM: 70000, Precio: 36000000, Combustible: '', Estado: 'Vendido' },
  { Marca: 'TOYOTA', Modelo: 'Hilux DX 2.4', Año: 2022, Color: 'Blanca', Patente: 'AF 599 FF', KM: 130000, Precio: 37000000, Combustible: '', Estado: 'Disponible' },
  // RENAULT
  { Marca: 'RENAULT', Modelo: 'Clio 1.2 16V', Año: 2008, Color: 'Gris', Patente: 'HRP 847', KM: 172000, Precio: 7500000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'RENAULT', Modelo: 'Clio 1.2', Año: 2009, Color: 'Azul', Patente: 'HUG 679', KM: 130000, Precio: 7800000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'RENAULT', Modelo: 'Clio Mio', Año: 2013, Color: 'Bordo', Patente: 'LZZ 083', KM: 162000, Precio: 11800000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'RENAULT', Modelo: 'Duster 2.0 4x4', Año: 2011, Color: 'Cobre', Patente: 'KSW 504', KM: 140000, Precio: 14000000, Combustible: '', Estado: 'Vendido' },
  { Marca: 'RENAULT', Modelo: 'Kangoo', Año: 2001, Color: 'Gris', Patente: '', KM: '', Precio: 6000000, Combustible: 'Diesel', Estado: 'Disponible' },
  { Marca: 'RENAULT', Modelo: 'Kangoo', Año: 2006, Color: 'Gris', Patente: '', KM: '', Precio: 7000000, Combustible: 'Diesel', Estado: 'Vendido' },
  { Marca: 'RENAULT', Modelo: 'Kwid Zen', Año: 2018, Color: 'Cobre', Patente: 'AC 540 NC', KM: 58000, Precio: 16000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'RENAULT', Modelo: 'Logan 1.6', Año: 2012, Color: 'Gris', Patente: 'LOQ 444', KM: 240000, Precio: '', Combustible: '', Estado: 'Disponible' },
  { Marca: 'RENAULT', Modelo: 'Sandero 1.6', Año: 2009, Color: 'Gris', Patente: '', KM: '', Precio: 10000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'RENAULT', Modelo: 'Sandero Confort', Año: 2012, Color: 'Gris', Patente: '', KM: '', Precio: 10800000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'RENAULT', Modelo: 'Sandero Expression', Año: 2019, Color: 'Blanco', Patente: '', KM: 70000, Precio: 18000000, Combustible: '', Estado: 'Disponible' },
  // NISSAN
  { Marca: 'NISSAN', Modelo: 'Tiida Tekna 1.8', Año: 2010, Color: 'Gris', Patente: 'INR 463', KM: 210000, Precio: 10000000, Combustible: '', Estado: 'Disponible' },
  // FORD
  { Marca: 'FORD', Modelo: 'EcoSport 1.6', Año: 2004, Color: 'Blanco', Patente: '', KM: 250000, Precio: 7000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'FORD', Modelo: 'EcoSport 1.4 TDCI', Año: 2006, Color: 'Negro', Patente: '', KM: '', Precio: 4000000, Combustible: 'Diesel', Estado: 'Vendido' },
  { Marca: 'FORD', Modelo: 'EcoSport 2.0', Año: 2008, Color: 'Negro', Patente: '', KM: 256000, Precio: 10000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'FORD', Modelo: 'EcoSport 2.0 XLT', Año: 2011, Color: 'Rojo', Patente: '', KM: 131000, Precio: 11000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'FORD', Modelo: 'Escort 1.8', Año: 1999, Color: 'Gris', Patente: '', KM: '', Precio: 4500000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'FORD', Modelo: 'Fiesta Ambiente', Año: 2006, Color: 'Rojo', Patente: '', KM: 214000, Precio: '', Combustible: '', Estado: 'Disponible' },
  { Marca: 'FORD', Modelo: 'Fiesta S 1.6', Año: 2016, Color: 'Blanco', Patente: '', KM: 130000, Precio: 17000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'FORD', Modelo: 'Focus 1 1.6', Año: 2008, Color: 'Negro', Patente: '', KM: '', Precio: 8000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'FORD', Modelo: 'Focus 2 1.6', Año: 2012, Color: 'Negro', Patente: '', KM: 260000, Precio: 10000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'FORD', Modelo: 'Ranger 3.0 Powerstroke', Año: 2011, Color: '', Patente: '', KM: '', Precio: '', Combustible: 'Diesel', Estado: 'Disponible' },
  // VOLKSWAGEN
  { Marca: 'VOLKSWAGEN', Modelo: 'Gol Power 1.6', Año: 2010, Color: 'Blanco', Patente: '', KM: 180000, Precio: 10000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'VOLKSWAGEN', Modelo: 'Gol Trend MSI', Año: 2016, Color: 'Gris Plata', Patente: '', KM: 130000, Precio: 15000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'VOLKSWAGEN', Modelo: 'New Beetle 2.0', Año: 2007, Color: 'Gris', Patente: '', KM: 226000, Precio: 12000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'VOLKSWAGEN', Modelo: 'Polo Classic 1.9 SD', Año: 2008, Color: 'Gris Oscuro', Patente: '', KM: 340000, Precio: 6500000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'VOLKSWAGEN', Modelo: 'Suran 1.6', Año: 2007, Color: 'Gris', Patente: '', KM: '', Precio: 8000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'VOLKSWAGEN', Modelo: 'Suran Highline', Año: 2009, Color: 'Gris', Patente: '', KM: 220000, Precio: 9000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'VOLKSWAGEN', Modelo: 'Suran 1.6', Año: 2011, Color: 'Gris', Patente: '', KM: 178000, Precio: 10600000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'VOLKSWAGEN', Modelo: 'Voyage 1.6', Año: 2012, Color: 'Negro', Patente: '', KM: 120000, Precio: 12000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'VOLKSWAGEN', Modelo: 'Amarok Comfortline 4x2 AT', Año: 2026, Color: 'Gris Plata', Patente: '', KM: 0, Precio: 61000000, Combustible: '', Estado: 'Disponible' },
  // FIAT
  { Marca: 'FIAT', Modelo: 'Palio Attractive', Año: 2018, Color: 'Blanco', Patente: '', KM: 112000, Precio: 15500000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'FIAT', Modelo: 'Palio', Año: 2011, Color: 'Gris', Patente: '', KM: '', Precio: '', Combustible: '', Estado: 'Disponible' },
  { Marca: 'FIAT', Modelo: 'Palio ELX', Año: 2007, Color: 'Gris Oscuro', Patente: '', KM: '', Precio: 7300000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'FIAT', Modelo: 'Siena', Año: 1999, Color: '', Patente: '', KM: '', Precio: '', Combustible: '', Estado: 'Disponible' },
  { Marca: 'FIAT', Modelo: 'Siena Attractive', Año: 2011, Color: 'Gris', Patente: '', KM: 225000, Precio: 9800000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'FIAT', Modelo: 'Siena Attractive', Año: 2013, Color: 'Marrón', Patente: '', KM: 146900, Precio: 11000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'FIAT', Modelo: 'Uno Fire', Año: 2012, Color: 'Negro', Patente: '', KM: 90000, Precio: 9000000, Combustible: '', Estado: 'Disponible' },
  // MOTOS
  { Marca: 'HONDA', Modelo: 'Wave 110', Año: 2021, Color: '', Patente: '', KM: 27170, Precio: 2700000, Combustible: '', Estado: 'Vendido' },
  { Marca: 'HONDA', Modelo: 'Wave 110', Año: 2023, Color: '', Patente: '', KM: 15480, Precio: 2900000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'HONDA', Modelo: 'CB 125', Año: 2014, Color: '', Patente: '', KM: 40000, Precio: 1500000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'HONDA', Modelo: 'XR 250', Año: 2023, Color: '', Patente: '', KM: 2776, Precio: 8500000, Combustible: '', Estado: 'Vendido' },
  { Marca: 'YAMAHA', Modelo: 'FZ 150', Año: 2019, Color: '', Patente: '', KM: 33900, Precio: 3500000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'MONDIAL', Modelo: 'HD 250', Año: 2010, Color: '', Patente: '', KM: 130000, Precio: 4000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'MOTOMEL', Modelo: 'S2 150', Año: 2021, Color: '', Patente: '', KM: 18000, Precio: 2300000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'MOTOMEL', Modelo: 'Skua 250', Año: 2019, Color: '', Patente: '', KM: 4500, Precio: 2800000, Combustible: '', Estado: 'Vendido' },
  { Marca: 'BRAVA', Modelo: 'Nevada 110', Año: 2025, Color: '', Patente: '', KM: 0, Precio: 2100000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'BMW', Modelo: 'G450X', Año: 2010, Color: '', Patente: '', KM: '', Precio: 10000000, Combustible: '', Estado: 'Disponible' },
  { Marca: 'KTM', Modelo: 'RC 200', Año: 2016, Color: '', Patente: '', KM: '', Precio: '', Combustible: '', Estado: 'Disponible' }
];

const worksheet = xlsx.utils.json_to_sheet(rawData);
const workbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(workbook, worksheet, 'Stock');

// Save to file
xlsx.writeFile(workbook, '../Stock_Formateado.xlsx');
console.log('Excel file created successfully at ../Stock_Formateado.xlsx');
