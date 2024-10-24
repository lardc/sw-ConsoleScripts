include("TestSCPC.js")
include("Tektronix.js")

portSCPC = 7
portTek = 11
portTOCU = 6

Contacts_Rshunt = 0.001;		// in Ohms
Contacts_RIngun = 0.002;		// in Ohms опытным путем
Contacts_IngunCount = 2;		// Количество контактов

PulsesInASeries = 2;			// Количество импульсов в серии
SeriesPauseSeconds = 2;			// Длительность паузы в серии между импульсами
DelayBetweenSeriesSeconds = 28;	// Длительность паузы между сериями
ResourceTestHours = 4;			// Длительность ресурного теста в часах

// Actions
Action_ContacsOn = 18;			// Команда на TOCU для замыкания пружинных контатков на шины
Action_ContacsOff = 26;			// Размыкание
Action_Pulse = 63;				// Формирование импульса с помощью сигнала синхронизации

csv_array	= [];

function Contacts_Init(portSCPC, portTOCU, portTek, channelVoltage, channelCurrent, channelSync)
{
	// Copy channel information
	ccontacts_chCurrent = channelCurrent;
	ccontacts_chVoltage = channelVoltage;
	ccontacts_chSync = channelSync;

	// Init Blocks
	portSCPC = portSCPC
	portTOCU = portTOCU
	
	// Init Tektronix
	TEK_PortInit(portTek);
	
	// Tektronix init
	// Init channels
	TEK_ChannelInit(ccontacts_chCurrent, "1", "1");
	TEK_ChannelInit(ccontacts_chVoltage, "1", "1");
	TEK_ChannelInit(ccontacts_chSync, "1", "1");
	// Init trigger
	TEK_TriggerPulseInit(ccontacts_chSync, "2.5");
	// Horizontal settings
	TEK_Horizontal("2.5e-3", "10e-3");
	
	// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == ccontacts_chCurrent || i == ccontacts_chVoltage || i == ccontacts_chSync)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}

	Contacts_TekMeasurement(ccontacts_chCurrent)
	Contacts_TekMeasurement(ccontacts_chVoltage)
}

function Contacts_TekMeasurement(Channel)
{
	TEK_Send("measurement:meas" + Channel + ":source ch" + Channel);
	TEK_Send("measurement:meas" + Channel + ":type maximum");
}

function Contacts_TekScale(Channel, Value)
{
	// 0.9 - use 90% of full range
	// 8 - number of scope grids in full scale
	var scale = (Value / (8 * 0.9));
	TEK_Send("ch" + Channel + ":scale " + scale);
}

function Contacts_Pulse(Current)
{
	var VertValueCurrent = Current * Contacts_Rshunt;
	var VertValueVoltage = ((Contacts_RIngun * 2) / (Contacts_IngunCount / 2)) * Current;

	Contacts_TekScale(ccontacts_chCurrent, VertValueCurrent);
	Contacts_TekScale(ccontacts_chVoltage, VertValueVoltage);

	dev.co(portTOCU);
	dev.c(Action_ContacsOn);
	sleep(3000)

	for (var i = 1; i <= PulsesInASeries; i++)
	{
		csv_array = [];

		dev.co(portSCPC);
		if(SC_SineConfig(Current))
			return 32;

		if(Contacts_AnykeyExit())
			return 8;

			var TimeStartActionPulse = new Date();
			var TimeEndActionPulse = new Date();
			var Seconds = TimeStartActionPulse.getSeconds() + SeriesPauseSeconds;
			TimeEndActionPulse.setSeconds(Seconds);
			
			dev.co(portTOCU);
			dev.c(Action_Pulse);

			sleep(20)
			dev.co(portSCPC);

			while (dev.r(REG_DEV_STATE) != DS_PulseEnd)
			{
				if(Contacts_AnykeyExit())
					return 8;
				if (Print_FaultDisableWarning())
					return 2;
			}

			sleep(1000);
			var v_sc = Contacts_MeasureV();
			var i_sc = Contacts_MeasureI();
			var p_sc = v_sc * i_sc * 0.0064;
			var r_sc = v_sc / i_sc;
			var r_1Ingun_sc = (r_sc / 2 * Contacts_IngunCount) / 2;

			if(r_1Ingun_sc >= 0.010 || i_sc < 100)		//Если сопротивление на один пруболее 10 мОм, то остановить тест
			{
				print("Контактное сопротивление на один контакт = " + r_1Ingun_sc.toFixed(6) + " Ом")
				print("Ток в цепи = " + i_sc.toFixed(1) + " А")
				print("Тест остановлен!")
				return 10;
			}
			
			print("Time Pulse   : " + TimeStartActionPulse);
			print("Utek,       V: " + v_sc);
			print("Itek,       A: " + i_sc.toFixed(3));
			print("Ptek,       W: " + p_sc.toFixed(3));
			print("Rtek,     Ohm: " + r_sc.toFixed(6));
			print("R_PerOne, Ohm: " + r_1Ingun_sc.toFixed(6));
			csv_array.push(TimeStartActionPulse + ";" + v_sc + ";" + i_sc + ";"
				+ p_sc + ";" + r_sc + ";" + r_1Ingun_sc);
			append("data/Contacts_ResourceTest.csv", csv_array);

			while((new Date()).getTime() < TimeEndActionPulse.getTime())
			{
				pinline("\rОжидание между импульсами = " + (TimeEndActionPulse.getTime() - (new Date()).getTime()) + " мс		");
				sleep(50);

				if(Contacts_AnykeyExit())
					return 15;
			}

			pinline("\r                                                            \r");
	}

	dev.co(portTOCU);
	dev.c(Action_ContacsOff);

	return 0;
}

function Contacts_ResourceTest(Current)
{
	csv_array = [];
	
	csv_array.push("Number of contacts = " + Contacts_IngunCount);
	csv_array.push("Time start action pulse; Utek, V; Itek, A; Ptek, W; Rtek, Ohm; R_PerOne, Ohm");

	append("data/Contacts_ResourceTest.csv", csv_array);

	var today = new Date();								// Узнаем и сохраняем текущее время
	var hours = today.getHours() + ResourceTestHours;	// Узнаем кол-во часов в текущем времени и прибавляем к нему продолжительность ресурсного теста
	today.setHours(hours);

	while((new Date()).getTime() < today.getTime())
	{
		var TimeStartSeries = new Date();
		var TimeEndSeries  = new Date();
		var Seconds = TimeStartSeries.getSeconds() + DelayBetweenSeriesSeconds + SeriesPauseSeconds;
		TimeEndSeries.setSeconds(Seconds);

		if(Contacts_Pulse(Current))
			return 5;

		while((new Date()).getTime() < TimeEndSeries.getTime())
		{
			pinline("\rПауза между серией = " + (TimeEndSeries.getTime() - (new Date()).getTime()) + " мс		");
			sleep(50);

			if(Contacts_AnykeyExit())
				return 58;
		}
		
		pinline("\r                                                            \r");

		if(Contacts_AnykeyExit())
			return 89;
	}
}

function Contacts_TestContactor()
{
	while(!anykey())
	{
		dev.co(portTOCU);
		dev.c(Action_ContacsOn);
		sleep(2000);

		dev.c(Action_ContacsOff);
		sleep(2000);
	}
}

function Contacts_MeasureV()
{
	var f = TEK_Measure(ccontacts_chVoltage);
	if (Math.abs(f) > 2e+4)
		f = 0;
	return f;
}

function Contacts_MeasureI()
{
	var f = TEK_Measure(ccontacts_chCurrent);
	if (Math.abs(f) > 2e+4)
		f = 0;
	return f / Contacts_Rshunt;
}

function Contacts_AnykeyExit()
{
	if (anykey())
	{
		dev.co(portTOCU);
		dev.c(Action_ContacsOff);
		print("\rStopped from user                              ");
		return 1;
	}

	return 0;
}