include("TestSCPC.js")
include("Tektronix.js")

portSCPC = 7
portTek = 11
portTOCU = 6

Contacts_Rshunt = 0.001;		// in Ohms
Contacts_RIngun = 0.005;		// in Ohms опытным путем
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

function Contacts_MathVertScale(Value)
{
	// 0.9 - use 90% of full range
	// 8 - number of scope grids in full scale
	var scale = (Value / (8 * 0.7));
	TEK_Send("MATH:VERtical:SCAle " + scale);
}

function Contacts_Pulse(Current)
{
	csv_array = [];
	
	var VertValueCurrent = Current * Contacts_Rshunt;
	var VertValueVoltage = Contacts_RIngun / (Contacts_IngunCount / 2) * Current;

	Contacts_TekScale(ccontacts_chCurrent, VertValueCurrent);
	Contacts_TekScale(ccontacts_chVoltage, VertValueVoltage);
	Contacts_MathVertScale(VertValueCurrent * VertValueVoltage);

	dev.co(portTOCU);
	dev.c(Action_ContacsOn);
	sleep(3000)

	for (var i = 1; i <= PulsesInASeries; i++)
	{
		dev.co(portSCPC);
		if(SC_SineConfig(Current))
			return;

		if(Contacts_AnykeyExit())
		{
			var TimeStartActionPulse = new Date();
			p("Time Pulse N" + i + ": "+ TimeStartActionPulse);
			var TimeEndActionPulse = new Date();
			var Seconds = TimeStartActionPulse.getSeconds() + SeriesPauseSeconds;
			TimeEndActionPulse.setSeconds(Seconds);
			
			dev.co(portTOCU);
			dev.c(Action_Pulse);

			sleep(20)
			dev.co(portSCPC);

			while (dev.r(REG_DEV_STATE) != DS_PulseEnd)
			{
				if(!Contacts_AnykeyExit())
					return 8;
				if (Print_FaultDisableWarning())
					return 2;
			}

			while((new Date()).getTime() < TimeEndActionPulse.getTime())
				if(!Contacts_AnykeyExit())
					return 15;
		}
	}

	sleep(1500);

	var v_sc = Contacts_MeasureV();
	var i_sc = Contacts_MeasureI();
	var p_sc = Contacts_MeasureP();
	var r_sc = v_sc / i_sc;
	var r_1Ingun_sc = (r_sc / 2 * Contacts_IngunCount) / 2;
	
	print("Utek,       V: " + v_sc);
	print("Itek,       A: " + i_sc.toFixed(3));
	print("Ptek,       W: " + p_sc.toFixed(3));
	print("Rtek,     Ohm: " + r_sc.toFixed(6));
	print("R_PerOne, Ohm: " + r_1Ingun_sc.toFixed(6));
	csv_array.push((new Date()) + ";" + v_sc + ";" + i_sc + ";"
		+ p_sc + ";" + r_sc + ";" + r_1Ingun_sc);
	append("data/Contacts_ResourceTest.csv", csv_array);

	dev.co(portTOCU);
	dev.c(Action_ContacsOff);
}

function Contacts_ResourceTest(Current)
{
	var today = new Date();								// Узнаем и сохраняем текущее время
	var hours = today.getHours() + ResourceTestHours;	// Узнаем кол-во часов в текущем времени и прибавляем к нему продолжительность ресурсного теста
	today.setHours(hours);

	while((new Date()).getTime() < today.getTime())
	{
		var TimeStartSeries = new Date();
		var TimeEndSeries  = new Date();
		var Seconds = TimeStartSeries.getSeconds() + DelayBetweenSeriesSeconds + SeriesPauseSeconds;
		TimeEndSeries.setSeconds(Seconds);

		Contacts_Pulse(Current);

		while((new Date()).getTime() < TimeEndSeries.getTime())
			if(!Contacts_AnykeyExit())
				return 58;

		if(!Contacts_AnykeyExit())
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

function Contacts_MeasureP()
{
	var f = TEK_Measure(3);
	if (Math.abs(f) > 2e+4)
		f = 0;
	return (f / Contacts_Rshunt) * 0.0064;
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
		print("Stopped from user")
		return 0;
	}

	return 1;
}