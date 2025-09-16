include("TestSCPC.js")
include("Tektronix_tmc.js")

SCPC	= 1
CUHV	= 2

Contacts_Rshunt = 0.001;		// in Ohms
Contacts_RIngun = 0.0016;		// in Ohms опытным путем
Contacts_IngunCount = 2;		// Количество контактов

PulsesInASeries = 1;			// Количество импульсов в серии
SeriesPauseSeconds = 0;			// Длительность паузы в серии между импульсами, в с
DelayBetweenSeriesSeconds = 4;	// Длительность паузы между сериями, в с
ResourceTestHours = 8;			// Длительность ресурного теста, в часах

// Actions
Action_ContacsOn = 18;			// Команда на CUHV для замыкания пружинных контатков на шины
Action_ContacsOff = 26;			// Размыкание
Action_Pulse = 63;				// Формирование импульса с помощью сигнала синхронизации

Contacts_Oscilloscope = 1;

csv_array = [];
counter = 1;

function Contacts_Connect(nameBlock)
{
	switch(nameBlock)
	{
		case SCPC:
			dev.co(20);
			break;

		case CUHV:
			dev.co(19);
			//dev.nid(1);
			break;
	}
}

function Contacts_Init(portTek, channelVoltage, channelCurrent, channelSync)
{
	// Copy channel information
	ccontacts_chCurrent = channelCurrent;
	ccontacts_chVoltage = channelVoltage;
	ccontacts_chSync = channelSync;
	
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
	TEK_Horizontal("1e-3", "10e-3");
	
	// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == ccontacts_chCurrent || i == ccontacts_chVoltage)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}

	TEK_Measurement(ccontacts_chCurrent)
	TEK_Measurement(ccontacts_chVoltage)
}

function Contacts_Init_TMC(channelVoltage, channelCurrent)
{
	// Copy channel information
	ccontacts_chCurrent = channelCurrent;
	ccontacts_chVoltage = channelVoltage;
	
	// Init Tektronix
	TEK_tmc_PortInit();
	TEK_tmc_FactoryReset();

	// Init trigger
	TEK_tmc_TriggerPulseExtInit(4.5, 1);
	// Tektronix init
	// Init channels
	TEK_tmc_ChannelInit(ccontacts_chVoltage, 1, 1);
	TEK_tmc_ChannelInvInit(ccontacts_chCurrent, 1, 1);

	// Horizontal settings
	TEK_tmc_Horizontal(1e-3, 15e-3);
	
	// Display channels
	for (var i = 1; i <= 4; i++)
	{
		if (i == ccontacts_chCurrent || i == ccontacts_chVoltage)
			TEK_tmc_ChannelOn(i);
		else
			TEK_tmc_ChannelOff(i);
	}

	TEK_tmc_Measurement(ccontacts_chVoltage, 1)
	TEK_tmc_Measurement(ccontacts_chCurrent, 2)
}

function Contacts_Pulse(Current)
{
	if (Contacts_Oscilloscope)
	{
		var VertValueCurrent = Current * Contacts_Rshunt;
		var VertValueVoltage = ((Contacts_RIngun * 2) / (Contacts_IngunCount / 2)) * Current;

		TEK_tmc_ScaleV(ccontacts_chCurrent, VertValueCurrent, 0.9);
		TEK_tmc_ScaleV(ccontacts_chVoltage, VertValueVoltage, 0.4);
	}

	Contacts_Connect(CUHV);
	dev.c(Action_ContacsOn);
	sleep(900)

	for (var i = 1; i <= PulsesInASeries; i++)
	{
		csv_array = [];

		TEK_tmc_TrigSequence();

		Contacts_Connect(SCPC);
		if(SC_SineConfig(Current))
			return 32;

		if(Contacts_AnykeyExit())
			return 8;

		if(PulsesInASeries > 1)
		{
			var TimeEndActionPulse = new Date();
			var Seconds = TimeStartActionPulse.getSeconds() + SeriesPauseSeconds;
			TimeEndActionPulse.setSeconds(Seconds);
		}

		var TimeStartActionPulse = new Date();
		
		Contacts_Connect(CUHV);
		dev.c(Action_Pulse);

		sleep(50)

		Contacts_Connect(SCPC);
		while (dev.r(REG_DEV_STATE) != DS_PulseEnd)
		{
			if(Contacts_AnykeyExit())
				return 8;
			if (Print_FaultDisableWarning())
				return 2;
		}

		print("-- result " + counter++ + " --");
		print("Time	    : " + TimeStartActionPulse);
		
		if (Contacts_Oscilloscope)
		{
			sleep(500);
			var v_sc = TEK_tmc_Measure(ccontacts_chVoltage).toFixed(4);
			var i_sc = TEK_tmc_Measure(ccontacts_chCurrent).toFixed(4) / Contacts_Rshunt;
			var p_sc = v_sc * i_sc * 0.0064;
			var r_sc = v_sc / i_sc;
			var r_1Ingun_sc = (r_sc / 2 * Contacts_IngunCount) / 2;
			
			print("Utek,	   V: " + v_sc);
			print("Itek,	   A: " + i_sc.toFixed(3));
			print("Ptek,	   W: " + p_sc.toFixed(3));
			print("Rtek,	 Ohm: " + r_sc.toFixed(6));
			print("R_Per1,	 Ohm: " + r_1Ingun_sc.toFixed(6));

			csv_array.push(TimeStartActionPulse + ";" + v_sc + ";" + i_sc + ";"
				+ p_sc + ";" + r_sc + ";" + r_1Ingun_sc);
			append("data/Contacts_ResourceTest.csv", csv_array);

			if(v_sc > VertValueVoltage * 3)
			{
				print("Расчетное напряжение в ~3 раза больше!");
				Contacts_Connect(CUHV);
				dev.c(Action_ContacsOff);
				print("Разжатие");
				return 18;
			}
		}

		if(PulsesInASeries > 1)
		{
			while((new Date()).getTime() < TimeEndActionPulse.getTime())
			{
				pinline("\rОжидание между импульсами = " + ((TimeEndActionPulse.getTime() - (new Date()).getTime()) / 1000).toFixed(2) + " с		");
				sleep(100);

				if(Contacts_AnykeyExit())
					return 15;
			}

			pinline("\r																														\r");
		}
	}

	Contacts_Connect(CUHV);
	dev.c(Action_ContacsOff);

	return 0;
}

function Contacts_ResourceTest(Current, Counter)
{
	csv_array = [];
	counter = Counter;
	TEK_tmc_TrigSequence();

	Contacts_Connect(SCPC);
	p("dev.r 4 SCPC = " + dev.r(4));
	p("dev.r 5 SCPC = " + dev.r(5));
	dev.w(0, 175)
	dev.w(1, 3300)
	dev.w(2, 359)
	dev.w(3, 37)
	dev.w(4, 830)
	dev.w(5, 100)
	for(reg = 6; reg <= 64; reg++){dev.w(reg,0)}
	p("Напряжение SCPC = " + dev.r(96) / 10);

	Contacts_Connect(CUHV)
	dev.w(60, 22100); // продолжительность импульса синхры
	
	if (Contacts_Oscilloscope)
	{
		csv_array.push("Time start action pulse; Utek, V; Itek, A; Ptek, W; Rtek, Ohm; R_PerOne, Ohm");
		append("data/Contacts_ResourceTest.csv", csv_array);
	}

	var today = new Date();								// Узнаем и сохраняем текущее время
	var hours = today.getHours() + ResourceTestHours;	// Узнаем кол-во часов в текущем времени и прибавляем к нему продолжительность ресурсного теста
	today.setHours(hours);

	period_i = 1;
	var PrevStart_ms = Date.now()

	while((new Date()).getTime() < today.getTime())
	{
		if (Contacts_Pulse(Current, Counter))
			return 5;

		while (Date.now() < PrevStart_ms + (DelayBetweenSeriesSeconds + SeriesPauseSeconds) * 1000 * period_i)
		{
			pinline("\rПауза между серией = " + ((Date.now() - (PrevStart_ms +
					(DelayBetweenSeriesSeconds + SeriesPauseSeconds) * 1000 * period_i)) / 1000).toFixed(2) + " с		");
			sleep(50);

			if(Contacts_AnykeyExit())
				return 58;
		}
		
		pinline("\r																														\r");

		var left_time = new Date((today.getTime()) - ((new Date()).getTime()));
		print("Осталось " + (left_time.getHours()-3) + " ч и " + left_time.getMinutes() + " мин");
		
		if (Contacts_AnykeyExit())
			return 89;

		period_i++;
	}
}

function Contacts_TestContactor(num_clamp)
{
	Contacts_Connect(CUHV);

	var i = 0;
	var period_ms = 3000;
	var period_unclamp_ms = 2000;
	var period_clamp_ms = period_ms - period_unclamp_ms;
	
	var PrevStartTS = Date.now()

	while(!anykey())
	{
		while(Date.now() < PrevStartTS + period_clamp_ms + period_ms * i)
		{
			pinline("\rРазжатие = " + (Date.now() - (PrevStartTS + period_clamp_ms + period_ms * i)) + "	");
			sleep(10);
		}
		pinline("\r													\r");

		dev.c(Action_ContacsOn);

		while(Date.now() < PrevStartTS + period_unclamp_ms + period_ms * i)
		{
			pinline("\rЗажатие = " + (Date.now() - (PrevStartTS + period_unclamp_ms + period_ms * i)) + "	");
			sleep(10);
		}
		
		pinline("\r													\r");

		dev.c(Action_ContacsOff);
		

		print("Clamp #" + num_clamp + " : " + (new Date()));
		i++;
		num_clamp++;
	}
}

function Contacts_AnykeyExit()
{
	if (anykey())
	{
		Contacts_Connect(CUHV);
		dev.c(Action_ContacsOff);
		print("\rStopped from user															");
		return 1;
	}

	return 0;
}
