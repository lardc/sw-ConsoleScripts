include("PrintStatus.js")

DS_None				= 0
DS_Fault			= 1
DS_Disabled			= 2
DS_BatteryCharge	= 3
DS_Ready			= 4
DS_InProcess		= 5

GatePulseTime 	= 1000;		// us
GateVoltage 	= 10000;	// mV
GateCurrent 	= 1000;		// mA
GatePulseDelay	= 0;		// uS
//
LSLH_Print = 1;

function LSLH_StartMeasure(Current)
{
	dev.w(150, GatePulseTime);
	dev.w(151, GateVoltage);
	dev.w(152, GateCurrent);
	dev.w(153, GatePulseDelay);
	dev.w(140, Current);
	
	var start = new Date();
	if(dev.r(192) != DS_Ready)
	{
		if (dev.r(192) == DS_Fault)
		{
			PrintStatus();
			dev.c(3);
			p("Сброшен Fault");
		}

		if (dev.r(192) == DS_None || dev.r(192) == DS_Disabled)
			dev.c(1);

		while (dev.r(192) != DS_Ready)
		{
			var end = new Date();
			pinline('\rВремя заряда, с: ' + (end - start) / 1000);
			sleep(100);
		}
		p("");
	}

	if(anykey()) return 0;

	if(dev.r(192) == DS_Ready)
	{
		dev.c(100);
		while(dev.r(192) != DS_Ready){sleep(500);}
		
		if(LSLH_Print)
		{			
			var Current = dev.r(206) + dev.r(205) / 10;
			
			print("DutVoltage, mV : " + dev.r(198));
			print("DutCurrent, A  : " + Current);
			print("GateVoltage, mV: " + dev.r(202));
			print("GateCurrent, mA: " + dev.r(203));
			print("---------------------------");
		}
		
		return 1;
	}
	else
		PrintStatus();
	
	return 0;
}
//--------------------------

function LSLH_ResourceTest(Current, HoursTest)
{
	csv_array = [];

	var i = 1;
	var count_plot = 0;
	var MinutesInMs = 60 * 1000;
	var end = new Date();
	var start = new Date();
	var hours = start.getHours() + HoursTest;
	end.setHours(hours);

	csv_array.push("N ; Utm, mV; Itm, A; Ugt, mV; Igt, mA; Hours ; Minutes; Seconds");

	while((new Date()).getTime() < end.getTime())
	{
		LSLH_StartMeasure(Current);

		var left_time = new Date(end.getTime() - (new Date()).getTime());
		var now_time = new Date();
		print("#" + i + " Осталось " + (left_time.getHours() - 3) + " ч и " + left_time.getMinutes() + " мин");

		var elapsed_time = new Date((new Date()).getTime() - start.getTime());
		if (elapsed_time.getTime() > 10 * MinutesInMs * count_plot)
		{
			pl(dev.rafs(1));
			p("Вывод графика #" + (count_plot + 1) + " спустя " +
				(elapsed_time.getHours() - 3) + " ч и " + elapsed_time.getMinutes() + " мин");

			count_plot++;
		}

		if (anykey()) break;

		csv_array.push( i + ";" + dev.r(198) + ";" + (dev.r(206) + dev.r(205) / 10) + ";" +
			dev.r(202) + ";" + dev.r(203) + ";" + now_time.getHours() +  ";" +
			now_time.getMinutes() + ";" + now_time.getSeconds());

		save("data/LSL_TestUTM" + end.getTime() + ".csv", csv_array);

		i++;
	}
}
//--------------------------

function LSLH_GD_Pulse(Current, Voltage, Tpulse)
{
	dev.w(150, Tpulse);
	dev.w(151, Voltage);
	dev.w(152, Current);
	dev.c(12);
}
//--------------------------





// Устаревшие функции
//----------------------------------------------------------------------------------
function LVTM_Pulse(CurrentValue)
{	
	//Variables
	var Error;
	//Const
	DEVICE_TYPE = 1234;//(1234-diode, 5678-thyristor)
	ERROR_STATE = 108;
	SCTU_READY = 103;
	CONFIG_READY = 105;
	SURGE_CURRENT_END = 107
	//	
	//DataTable addresses
	DeviceTypeAdr = 70;
	CurrentValueAdr = 64;
	StatusAdr = 66;
	ErrorAdr = 67;
	//
	//Command
	CURRENT_CONFIG_COM = 2;
	CURRENT_START_COM = 5;
	ERRORS_CLEAR_COM = 4;
	//
	//Errors
	SCPC_NOT_ANS = 9;
	SCPC_PULSE_ERROR = 8;
	SCPC_ERROR = 1;

    dev.nid(0);

	//Заряд батареи
	while(dev.r(StatusAdr)!=SCTU_READY)
	{
		sleep(1000);
		if(dev.r(StatusAdr)==ERROR_STATE)
		{
			Error=dev.r(ErrorAdr);
			print("Error="+Error);
			
			if((Error!=SCPC_NOT_ANS)&&(Error!=SCPC_PULSE_ERROR)&&(Error!=SCPC_ERROR))
			{
				dev.c(ERRORS_CLEAR_COM);
				sleep(1000);
				SCSerial(Nid,CurrentValue, PulseCount);
			}
			return;
		}
	}
	
	//Запись значения ударного тока
	dev.w(DeviceTypeAdr, DEVICE_TYPE);
	dev.w(CurrentValueAdr, CurrentValue);
	sleep(100);
	dev.c(CURRENT_CONFIG_COM);
	sleep(100);
	while(dev.r(StatusAdr)!=CONFIG_READY)
	{
		sleep(100);
		if(dev.r(StatusAdr)==ERROR_STATE)
		{
			Error=dev.r(ErrorAdr);
			print("Error="+Error);
			
			if((Error!=SCPC_NOT_ANS)&&(Error!=SCPC_PULSE_ERROR)&&(Error!=SCPC_ERROR))
			{
				dev.c(ERRORS_CLEAR_COM);
				sleep(1000);
				SCSerial(Nid,CurrentValue, PulseCount);
			}
			return;
		}
	}
	
	//Формирование ударного тока
	dev.c(CURRENT_START_COM);
	//
	sleep(100);
	
	while(dev.r(StatusAdr)!=SURGE_CURRENT_END)
	{
		sleep(1000);
		if(dev.r(StatusAdr)==ERROR_STATE)
		{
			Error=dev.r(ErrorAdr);
			print("Error="+Error);
			
			if((Error!=SCPC_NOT_ANS)&&(Error!=SCPC_PULSE_ERROR)&&(Error!=SCPC_ERROR))
			{
				dev.c(ERRORS_CLEAR_COM);
				sleep(1000);
				SCSerial(Nid,CurrentValue, PulseCount);
				
			}
			return;
		}
	}
}
//----------------------------------------------------------------------------------

//----------------------------------------------------------------------------------
function LVTM_PulseSerial(CurrentValue, PulseNumber)
{	
	//Variables
	var PulseCount = PulseNumber;
	//

    dev.nid(0);

	while(PulseCount>0)
	{	
		//Формируем импульс
		LVTM_Pulse(CurrentValue);
		//
		
		//if (anykey()) return;
		
		//Печать данных на экране	
		print("PulseCount         = "+(PulseNumber-PulseCount+1));	
		//
		
		PulseCount--;
	}
}
//----------------------------------------------------------------------------------

//----------------------------------------------------------------------------------
function LVTM_TEKInit(Port)
{
	//Tektronix config
	include("Tektronix.js");
	TEK_PortInit(Port);
	TEK_ChannelInit(1, 1, 0.2);//(channel,probe,scale) I dut
	TEK_ChannelInit(2, 1, 0.5);//(channel,probe,scale) U dut
	TEK_ChannelInit(3, 1, 2);//(channel,probe,scale) sync
	TEK_TriggerInit(3, 2.5);//(channel,level) sync
	TEK_Horizontal(2.5e-3, 5e-3);//(scale,position)
}
//----------------------------------------------------------------------------------

//----------------------------------------------------------------------------------
function LVTM_Cal_I(Imin, Imax, dI, FileName)
{
	//Variables
	var PulseNumber = (Imax-Imin)/dI+1;
	var PulseCount = PulseNumber;
	var TEK_DUT_Current=0;
	var LSLH_DUT_Current=0;
	var Stroka = [];
	var CurrentValue = Imin;
	//DataTable addresses
	Dut_I_Adr = 73;
	//
	
	LVTM_TEKInit();
	LVTM_TEK_Cursor(1);

    dev.nid(0);

	while(PulseCount>0)
	{	
		//Подстраиваем масштаб осциллографа под амплитуду тока
		if(CurrentValue>=2000)TEK_ChannelInit(1, 1, 0.2);//(channel,probe,scale) I dut
		if((CurrentValue<2000)&&(CurrentValue>=1000))TEK_ChannelInit(1, 1, 0.1);//(channel,probe,scale) I dut
		if((CurrentValue<1000)&&(CurrentValue>=400))TEK_ChannelInit(1, 1, 0.05);//(channel,probe,scale) I dut
		if((CurrentValue<400)&&(CurrentValue>=100))TEK_ChannelInit(1, 1, 0.02);//(channel,probe,scale) I dut
		//
	
		//Формируем импульс
		LVTM_Pulse(CurrentValue);
		//
		
		//Измеряем остальные параметры
		LSLH_DUT_Current=dev.r(Dut_I_Adr);
		sleep(2000);
		TEK_DUT_Current=Math.floor((TEK_Exec("cursor:vbars:hpos1?"))*200/0.075);
		//
		
		//Сохраняем данные в файл
		Stroka[0]="Pulse count;Current,A;LSLH DUT current,A;TEK DUT current,A";
		Stroka[PulseNumber-PulseCount+1]=((PulseNumber-PulseCount+1)+";"+CurrentValue+";"+LSLH_DUT_Current+";"+TEK_DUT_Current);
		save(FileName,Stroka);
		//
		
		//Печать данных на экране
		print("");		
		print("PulseCount         = "+(PulseNumber-PulseCount+1));	
		print("Current value      = "+CurrentValue+"A");
		print("LSLH DUT current   = "+LSLH_DUT_Current+"A");
		print("TEK DUT current    = "+TEK_DUT_Current+"A");
		//
		
		//	
		CurrentValue+=dI;
		if(CurrentValue>Imax)
		{
			CurrentValue=Imin;
		}
	//
		
		PulseCount--;
	}
}
//----------------------------------------------------------------------------------

//----------------------------------------------------------------------------------
function LVTM_Cal_U(Imin, Imax, dI, FileName)
{
	//Variables
	var PulseNumber = (Imax-Imin)/dI+1;
	var PulseCount = PulseNumber;
	var TEK_DUT_Voltage=0;
	var LSLH_DUT_Voltage=0;
	var Stroka = [];
	var CurrentValue = Imin;
	//DataTable addresses
	Dut_U_Adr = 72;
	//

	LVTM_TEKInit();
	LVTM_TEK_Cursor(2);
	
    dev.nid(0);

	while(PulseCount>0)
	{
		//Подстраиваем масштаб осциллографа под амплитуду тока
		if(CurrentValue>=2000)TEK_ChannelInit(1, 1, 0.2);//(channel,probe,scale) I dut
		if((CurrentValue<2000)&&(CurrentValue>=1000))TEK_ChannelInit(1, 1, 0.1);//(channel,probe,scale) I dut
		if((CurrentValue<1000)&&(CurrentValue>=400))TEK_ChannelInit(1, 1, 0.05);//(channel,probe,scale) I dut
		if((CurrentValue<400)&&(CurrentValue>=100))TEK_ChannelInit(1, 1, 0.02);//(channel,probe,scale) I dut
		//
	
		//Формируем импульс
		LVTM_Pulse(CurrentValue);
		//
		
		//Измеряем остальные параметры
		LSLH_DUT_Voltage=(dev.r(Dut_U_Adr)/1000);
		sleep(2000);
		TEK_DUT_Voltage=parseFloat(TEK_Exec("cursor:vbars:hpos1?")).toFixed(3);
		//
		
		//Сохраняем данные в файл
		Stroka[0]="Pulse count;Current,A;LSLH DUT voltage,V;TEK DUT voltage,V";
		Stroka[PulseNumber-PulseCount+1]=((PulseNumber-PulseCount+1)+";"+CurrentValue+";"+LSLH_DUT_Voltage+";"+TEK_DUT_Voltage);
		save(FileName,Stroka);
		//
		
		//Печать данных на экране
		print("");		
		print("PulseCount         = "+(PulseNumber-PulseCount+1));	
		print("Current value      = "+CurrentValue+"A");
		print("LSLH DUT voltage   = "+LSLH_DUT_Voltage+"V");
		print("TEK DUT voltage    = "+TEK_DUT_Voltage+"V");
		//
		
		//	
		CurrentValue+=dI;
		if(CurrentValue>Imax)
		{
			CurrentValue=Imin;
		}
	//
		
		PulseCount--;
	}
}
//----------------------------------------------------------------------------------

//----------------------------------------------------------------------------------
function LVTMInfo()
{
	var Total = dev.r(110);
	var count=0;
	
	dev.nid(0);
	
	print("Status        = "+dev.r(66));
	print("Error         = "+dev.r(67));
	print("Temperature   = "+dev.r(68));
	print("Mean voltage  = "+dev.r(65)/10+"V");
	print("SC max. value = "+dev.r(69)+"A");
	print("SCPCs total   = "+Total);
	print("");
	
	print("SCPCs Nid:");
	while(Total>0)
	{
		print(dev.r(74+count));
		count++;
		Total--;
	}
}
//----------------------------------------------------------------------------------

//----------------------------------------------------------------------------------
function SCPCInfo(Nid)
{
	dev.nid(Nid);
	
	print("Status="+dev.r(66));
	print("Error="+dev.r(67));
	print("Temperature="+dev.r(68));
	print("Voltage="+dev.r(65)/10+"V");
}
//----------------------------------------------------------------------------------

//----------------------------------------------------------------------------------
function LVTM_TEK_Cursor(Channel)
{
	TEK_Send("cursor:select:source ch" + Channel);
	TEK_Send("cursor:function vbars");
	TEK_Send("cursor:vbars:position1 5e-3");
}
//----------------------------------------------------------------------------------